/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheWorkspaceMain } from '../common/che-protocol';
import { ConfirmDialog } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core';
import { RestartWorkspaceOptions } from '@eclipse-che/plugin';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { che as cheApi } from '@eclipse-che/api';
import { interfaces } from 'inversify';

export class CheWorkspaceMainImpl implements CheWorkspaceMain {
  private readonly workspaceService: WorkspaceService;

  protected readonly messageService: MessageService;

  private readonly windowService: WindowService;

  constructor(container: interfaces.Container) {
    this.workspaceService = container.get(WorkspaceService);
    this.messageService = container.get(MessageService);
    this.windowService = container.get(WindowService);
  }

  $getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
    return this.workspaceService.currentWorkspace().then(
      workspace => workspace,
      error => {
        console.log(error);
        return undefined!;
      }
    );
  }

  async $getById(workspaceId: string): Promise<cheApi.workspace.Workspace> {
    return this.workspaceService.getWorkspaceById(workspaceId).then(
      workspace => workspace,
      error => {
        console.log(error);
        return undefined!;
      }
    );
  }

  async $update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<cheApi.workspace.Workspace> {
    return await this.workspaceService.updateWorkspace(workspaceId, workspace);
  }

  async $restartWorkspace(machineToken: string, restartWorkspaceOptions?: RestartWorkspaceOptions): Promise<boolean> {
    if (restartWorkspaceOptions && restartWorkspaceOptions.prompt) {
      let msg = restartWorkspaceOptions.promptMessage;
      if (!msg) {
        msg = 'A plug-in has requested the restart of the workpspace. Do you want to proceed ?';
      }
      const confirm = new ConfirmDialog({
        title: 'Restart Your Workspace',
        msg,
        ok: 'Restart',
      });

      const confirmRestart = await confirm.open();
      if (!confirmRestart) {
        return false;
      }
    }

    // get workspace ID
    const cheWorkspaceID = await this.workspaceService.getCurrentWorkspaceId();
    this.messageService.info('Workspace is restarting...');
    // disable any other popup that may be after that.
    this.windowService.canUnload = () => true;

    // ask Dashboard to restart the workspace giving him workspace ID & machine token
    window.parent.postMessage(`restart-workspace:${cheWorkspaceID}:${machineToken}`, '*');
    return true;
  }
}
