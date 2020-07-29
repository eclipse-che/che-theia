/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { inject, injectable } from 'inversify';
import {
    QuickOpenGroupItem,
    QuickOpenItem,
    QuickOpenMode,
    QuickOpenModel
} from '@theia/core/lib/common/quick-open-model';
import { LabelProvider, QuickOpenService } from '@theia/core/lib/browser';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { che } from '@eclipse-che/api';
import { OauthUtils } from '@eclipse-che/theia-plugin-ext/lib/browser/oauth-utils';
import { MessageService } from '@theia/core/lib/common/message-service';
import * as moment from 'moment';
import { CheWorkspaceUtils } from './che-workspace-utils';

@injectable()
export class QuickOpenCheWorkspace implements QuickOpenModel {
    protected items: QuickOpenGroupItem[];
    protected currentWorkspace: che.workspace.Workspace;

    @inject(QuickOpenService) protected readonly quickOpenService: QuickOpenService;
    @inject(CheApiService) protected readonly cheApi: CheApiService;
    @inject(OauthUtils) protected readonly oAuthUtils: OauthUtils;
    @inject(LabelProvider) protected readonly labelProvider: LabelProvider;
    @inject(MessageService) protected readonly messageService: MessageService;

    private async open(workspaces: che.workspace.Workspace[], acceptor: (workspace: che.workspace.Workspace) => void): Promise<void> {
        this.items = [];

        if (!workspaces.length) {
            this.items.push(new QuickOpenGroupItem({
                label: 'No Recent Workspaces',
                run: (mode: QuickOpenMode): boolean => false
            }));
            return;
        }

        for (const workspace of workspaces) {
            const icon = this.labelProvider.folderIcon;
            const iconClass = icon + ' file-icon';
            this.items.push(new QuickOpenGroupItem({
                label: CheWorkspaceUtils.getWorkspaceName(workspace) + (this.isCurrentWorkspace(workspace) ? ' (Current)' : ''),
                detail: `Stack: ${CheWorkspaceUtils.getWorkspaceStack(workspace)}`,
                groupLabel: `last modified ${moment(CheWorkspaceUtils.getWorkspaceModificationTime(workspace)).fromNow()}`,
                iconClass,
                run: (mode: QuickOpenMode): boolean => {
                    if (mode !== QuickOpenMode.OPEN) {
                        return false;
                    }

                    if (this.isCurrentWorkspace(workspace)) {
                        return true;
                    }

                    acceptor(workspace);

                    return true;
                },
            }));
        }

        this.quickOpenService.open(this, {
            placeholder: 'Type the name of the Che workspace you want to open',
            fuzzyMatchLabel: true,
            fuzzySort: false
        });
    }

    onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        acceptor(this.items);
    }

    async select(recent: boolean, acceptor: (workspace: che.workspace.Workspace) => void): Promise<void> {
        this.items = [];

        const token = await this.oAuthUtils.getUserToken();

        if (!this.currentWorkspace) {
            this.currentWorkspace = await this.cheApi.currentWorkspace();
        }

        if (!this.currentWorkspace.namespace) {
            return;
        }

        let workspaces = await this.cheApi.getAllByNamespace(this.currentWorkspace.namespace, token);

        if (recent) {
            workspaces.sort(CheWorkspaceUtils.modificationTimeComparator);

            if (workspaces.length > 5) {
                workspaces = workspaces.slice(0, 5);
            }
        }

        await this.open(workspaces, acceptor);
    }

    private isCurrentWorkspace(workspace: che.workspace.Workspace): boolean {
        return this.currentWorkspace.id === workspace.id;
    }
}
