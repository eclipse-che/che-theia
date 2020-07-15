/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
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
import { che as cheApi } from '@eclipse-che/api';
import { OauthUtils } from '@eclipse-che/theia-plugin-ext/lib/browser/oauth-utils';
import { AbstractDialog } from '@theia/core/lib/browser/dialogs';
import { MessageService } from '@theia/core/lib/common/message-service';
import * as moment from 'moment';
import { Message } from '@theia/core/lib/browser/widgets/index';
import { Key } from '@theia/core/lib/browser/keyboard/keys';

@injectable()
export class QuickOpenCheWorkspace implements QuickOpenModel {
    protected items: QuickOpenGroupItem[];
    protected currentWorkspace: cheApi.workspace.Workspace;

    @inject(QuickOpenService) protected readonly quickOpenService: QuickOpenService;
    @inject(CheApiService) protected readonly cheApi: CheApiService;
    @inject(OauthUtils) protected readonly oAuthUtils: OauthUtils;
    @inject(LabelProvider) protected readonly labelProvider: LabelProvider;
    @inject(MessageService) protected readonly messageService: MessageService;

    private async open(workspaces: cheApi.workspace.Workspace[]): Promise<void> {
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
                label: this.getWorkspaceName(workspace) + (this.isCurrentWorkspace(workspace) ? ' (Current)' : ''),
                detail: `Stack: ${this.getWorkspaceStack(workspace)}`,
                groupLabel: `last modified ${moment(this.getWorkspaceModificationTime(workspace)).fromNow()}`,
                iconClass,
                run: (mode: QuickOpenMode): boolean => {
                    if (mode !== QuickOpenMode.OPEN) {
                        return false;
                    }

                    if (this.isCurrentWorkspace(workspace)) {
                        return true;
                    }

                    this.openWorkspace(workspace);

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

    async select(): Promise<void> {
        this.items = [];

        const token = await this.oAuthUtils.getUserToken();

        if (!this.currentWorkspace) {
            this.currentWorkspace = await this.cheApi.currentWorkspace();
        }

        if (!this.currentWorkspace.namespace) {
            return;
        }

        const workspaces = await this.cheApi.getAllByNamespace(this.currentWorkspace.namespace, token);

        workspaces.sort((a: cheApi.workspace.Workspace, b: cheApi.workspace.Workspace) => {
            const updatedA: number = this.getWorkspaceModificationTime(a);
            const updatedB: number = this.getWorkspaceModificationTime(b);

            if (isNaN(updatedA) || isNaN(updatedB)) {
                return 0;
            } else {
                return updatedB - updatedA;
            }
        });

        await this.open(workspaces);
    }

    private getWorkspaceName(workspace: cheApi.workspace.Workspace): string | undefined {
        if (workspace.devfile && workspace.devfile.metadata) {
            return workspace.devfile.metadata.name;
        }
    }

    private getWorkspaceStack(workspace: cheApi.workspace.Workspace): string | undefined {
        return workspace.attributes && workspace.attributes.stackName ? workspace.attributes.stackName : 'Custom';
    }

    private getWorkspaceModificationTime(workspace: cheApi.workspace.Workspace): number {
        if (workspace.attributes) {
            if (workspace.attributes.updated) {
                return parseInt(workspace.attributes.updated);
            } else if (workspace.attributes.created) {
                return parseInt(workspace.attributes.created);
            }
        }

        return NaN;
    }

    private stopCurrentWorkspace(): Promise<boolean | undefined> {
        class StopWorkspaceDialog extends AbstractDialog<boolean | undefined> {
            protected confirmed: boolean | undefined = true;
            protected readonly dontStopButton: HTMLButtonElement;

            constructor() {
                super({
                    title: 'Open Workspace'
                });

                this.contentNode.appendChild(this.createMessageNode('Do you want to stop current workspace?'));
                this.appendCloseButton('Cancel');
                this.dontStopButton = this.appendDontStopButton();
                this.appendAcceptButton('Yes');
            }

            get value(): boolean | undefined {
                return this.confirmed;
            }

            protected appendDontStopButton(): HTMLButtonElement {
                const button = this.createButton('No');
                this.controlPanel.appendChild(button);
                button.classList.add('secondary');
                return button;
            }

            protected onAfterAttach(msg: Message): void {
                super.onAfterAttach(msg);
                this.addKeyListener(this.dontStopButton, Key.ENTER, () => {
                    this.confirmed = false;
                    this.accept();
                }, 'click');
            }

            protected onCloseRequest(msg: Message): void {
                super.onCloseRequest(msg);
                this.confirmed = undefined;
                this.accept();
            }

            protected createMessageNode(msg: string | HTMLElement): HTMLElement {
                if (typeof msg === 'string') {
                    const messageNode = document.createElement('div');
                    messageNode.textContent = msg;
                    return messageNode;
                }
                return msg;
            }

        }

        return new StopWorkspaceDialog().open();
    }

    private async openWorkspace(workspace: cheApi.workspace.Workspace): Promise<void> {
        const result = await this.stopCurrentWorkspace();
        if (typeof result === 'boolean') {
            if (result) {
                await this.cheApi.stop();
            }
            window.parent.postMessage(`open-workspace:${workspace.id}`, '*');
        }
    }

    private isCurrentWorkspace(workspace: cheApi.workspace.Workspace): boolean {
        return this.currentWorkspace.id === workspace.id;
    }
}
