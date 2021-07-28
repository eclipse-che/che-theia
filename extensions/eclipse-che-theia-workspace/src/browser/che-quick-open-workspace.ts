/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as moment from 'moment';

import { LabelProvider, QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { Workspace, WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import { CheWorkspaceUtils } from './che-workspace-utils';
import { MessageService } from '@theia/core/lib/common/message-service';
import { OauthUtils } from '@eclipse-che/theia-remote-api/lib/browser/oauth-utils';

@injectable()
export class QuickOpenCheWorkspace {
  protected items: QuickPickItem[];
  protected currentWorkspace: Workspace;

  @inject(QuickInputService) protected readonly quickInputService: QuickInputService;
  @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;
  @inject(OauthUtils) protected readonly oAuthUtils: OauthUtils;
  @inject(LabelProvider) protected readonly labelProvider: LabelProvider;
  @inject(MessageService) protected readonly messageService: MessageService;

  private async open(workspaces: Workspace[], acceptor: (workspace: Workspace) => void): Promise<void> {
    this.items = [];

    if (!workspaces.length) {
      this.items.push({
        label: 'No Recent Workspaces',
      });
      return;
    }

    for (const workspace of workspaces) {
      const icon = this.labelProvider.folderIcon;
      const iconClass = icon + ' file-icon';
      const groupLabel = `last modified ${moment(CheWorkspaceUtils.getWorkspaceModificationTime(workspace)).fromNow()}`;
      this.items.push({ type: 'separator', label: groupLabel });
      this.items.push({
        label: workspace.name + (this.isCurrentWorkspace(workspace) ? ' (Current)' : ''),
        detail: `Stack: ${CheWorkspaceUtils.getWorkspaceStack(workspace)}`,
        iconClasses: [iconClass],
        execute: (item: QuickPickItem) => {
          if (this.isCurrentWorkspace(workspace)) {
            return true;
          }

          acceptor(workspace);

          return true;
        },
      });
      this.items.push({ type: 'separator', label: groupLabel });
    }

    this.quickInputService.showQuickPick(this.items, {
      placeholder: 'Type the name of the Che workspace you want to open',
    });
  }

  async select(recent: boolean, acceptor: (workspace: Workspace) => void): Promise<void> {
    this.items = [];

    const token = await this.oAuthUtils.getUserToken();

    if (!this.currentWorkspace) {
      this.currentWorkspace = await this.workspaceService.currentWorkspace();
    }

    if (!this.currentWorkspace.namespace) {
      return;
    }

    let workspaces = await this.workspaceService.getAllByNamespace(this.currentWorkspace.namespace, token);

    if (recent) {
      workspaces.sort(CheWorkspaceUtils.modificationTimeComparator);

      if (workspaces.length > 5) {
        workspaces = workspaces.slice(0, 5);
      }
    }

    await this.open(workspaces, acceptor);
  }

  private isCurrentWorkspace(workspace: Workspace): boolean {
    return this.currentWorkspace.id === workspace.id;
  }
}
