/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { inject, injectable } from 'inversify';

import { CheWorkspaceController } from './che-workspace-controller';
import { Command } from '@theia/core/lib/common/command';
import { CommonMenus } from '@theia/core/lib/browser';
import { WorkspaceCommands } from '@theia/workspace/lib/browser/workspace-commands';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

export namespace CheWorkspaceCommands {
  const WORKSPACE_CATEGORY = 'Workspace';
  const FILE_CATEGORY = 'File';

  export const OPEN_WORKSPACE: Command = {
    id: 'che.openWorkspace',
    category: FILE_CATEGORY,
    label: 'Open Workspace...',
  };
  export const OPEN_RECENT_WORKSPACE: Command = {
    id: 'che.openRecentWorkspace',
    category: FILE_CATEGORY,
    label: 'Open Recent Workspace...',
  };
  export const CLOSE_CURRENT_WORKSPACE: Command = {
    id: 'che.closeCurrentWorkspace',
    category: WORKSPACE_CATEGORY,
    label: 'Close Workspace',
  };
  export const SAVE_WORKSPACE_AS: Command = {
    id: 'che.saveWorkspaceAs',
    category: WORKSPACE_CATEGORY,
    label: 'Save Workspace As...',
  };
  export const OPEN_WORKSPACE_ROOTS: Command & { dialogLabel: string } = {
    id: 'workspace:openWorkspace',
    category: FILE_CATEGORY,
    label: 'Open Workspace Roots...',
    dialogLabel: 'Open Workspace Roots',
  };
  export const OPEN_RECENT_WORKSPACE_ROOTS: Command = {
    id: 'workspace:openRecent',
    category: FILE_CATEGORY,
    label: 'Open Recent Workspace Roots...',
  };
  export const CLOSE_WORKSPACE_ROOTS: Command = {
    id: 'workspace:close',
    category: WORKSPACE_CATEGORY,
    label: 'Close Workspace Roots',
  };
  export const SAVE_WORKSPACE_ROOTS_AS: Command = {
    id: 'workspace:saveAs',
    category: WORKSPACE_CATEGORY,
    label: 'Save Workspace Roots As...',
  };
}

@injectable()
export class CheWorkspaceContribution implements CommandContribution, MenuContribution {
  @inject(CheWorkspaceController) protected readonly workspaceController: CheWorkspaceController;
  @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(CheWorkspaceCommands.OPEN_WORKSPACE, {
      execute: () => this.workspaceController.openWorkspace(),
    });
    commands.registerCommand(CheWorkspaceCommands.OPEN_RECENT_WORKSPACE, {
      execute: () => this.workspaceController.openRecentWorkspace(),
    });
    commands.registerCommand(CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE, {
      execute: () => this.workspaceController.closeCurrentWorkspace(),
    });
    commands.registerCommand(CheWorkspaceCommands.SAVE_WORKSPACE_AS, {
      execute: () => this.workspaceController.saveWorkspaceAs(),
    });

    commands.unregisterCommand(WorkspaceCommands.OPEN_WORKSPACE);
    commands.registerCommand(CheWorkspaceCommands.OPEN_WORKSPACE_ROOTS, {
      execute: () => this.workspaceController.openWorkspaceRoots(),
    });
    commands.unregisterCommand(WorkspaceCommands.OPEN_RECENT_WORKSPACE);
    commands.registerCommand(CheWorkspaceCommands.OPEN_RECENT_WORKSPACE_ROOTS, {
      execute: () => this.workspaceController.openRecentWorkspaceRoots(),
    });
    commands.unregisterCommand(WorkspaceCommands.CLOSE);
    commands.registerCommand(CheWorkspaceCommands.CLOSE_WORKSPACE_ROOTS, {
      isEnabled: () => this.workspaceService.opened,
      execute: () => this.workspaceController.closeWorkspaceRoots(),
    });
    commands.unregisterCommand(WorkspaceCommands.SAVE_WORKSPACE_AS);
    commands.registerCommand(CheWorkspaceCommands.SAVE_WORKSPACE_ROOTS_AS, {
      isEnabled: () => this.workspaceService.isMultiRootWorkspaceEnabled,
      execute: () => this.workspaceController.saveWorkspaceRootsAs(),
    });
  }

  registerMenus(menus: MenuModelRegistry): void {
    menus.unregisterMenuAction(
      {
        commandId: WorkspaceCommands.OPEN_WORKSPACE.id,
      },
      CommonMenus.FILE_OPEN
    );
    menus.unregisterMenuAction(
      {
        commandId: WorkspaceCommands.OPEN_RECENT_WORKSPACE.id,
      },
      CommonMenus.FILE_OPEN
    );
    menus.unregisterMenuAction(
      {
        commandId: WorkspaceCommands.CLOSE.id,
      },
      CommonMenus.FILE_CLOSE
    );
    menus.unregisterMenuAction(
      {
        commandId: WorkspaceCommands.SAVE_WORKSPACE_AS.id,
      },
      CommonMenus.FILE_OPEN
    );

    menus.registerMenuAction(CommonMenus.FILE_OPEN, {
      commandId: CheWorkspaceCommands.OPEN_WORKSPACE.id,
      label: CheWorkspaceCommands.OPEN_WORKSPACE.label,
      order: 'a10',
    });
    menus.registerMenuAction(CommonMenus.FILE_OPEN, {
      commandId: CheWorkspaceCommands.OPEN_WORKSPACE_ROOTS.id,
      label: CheWorkspaceCommands.OPEN_WORKSPACE_ROOTS.label,
      order: 'a11',
    });
    menus.registerMenuAction(CommonMenus.FILE_OPEN, {
      commandId: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE.id,
      label: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE.label,
      order: 'a20',
    });
    menus.registerMenuAction(CommonMenus.FILE_OPEN, {
      commandId: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE_ROOTS.id,
      label: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE_ROOTS.label,
      order: 'a21',
    });
    menus.registerMenuAction(CommonMenus.FILE_CLOSE, {
      commandId: CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE.id,
      label: CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE.label,
    });
    menus.registerMenuAction(CommonMenus.FILE_CLOSE, {
      commandId: CheWorkspaceCommands.CLOSE_WORKSPACE_ROOTS.id,
      label: CheWorkspaceCommands.CLOSE_WORKSPACE_ROOTS.label,
    });
    menus.registerMenuAction(CommonMenus.FILE_OPEN, {
      commandId: CheWorkspaceCommands.SAVE_WORKSPACE_AS.id,
      label: CheWorkspaceCommands.SAVE_WORKSPACE_AS.label,
      order: 'a30',
    });
    menus.registerMenuAction(CommonMenus.FILE_OPEN, {
      commandId: CheWorkspaceCommands.SAVE_WORKSPACE_ROOTS_AS.id,
      label: CheWorkspaceCommands.SAVE_WORKSPACE_ROOTS_AS.label,
      order: 'a31',
    });
  }
}
