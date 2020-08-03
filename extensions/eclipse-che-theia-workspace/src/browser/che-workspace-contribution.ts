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
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { WorkspaceCommands } from '@theia/workspace/lib/browser/workspace-commands';
import { Command } from '@theia/core/lib/common/command';
import { CheWorkspaceController } from './che-workspace-controller';

export namespace CheWorkspaceCommands {

    const WORKSPACE_CATEGORY = 'Workspace';
    const FILE_CATEGORY = 'File';

    export const OPEN_WORKSPACE: Command = {
        id: 'che.openWorkspace',
        category: FILE_CATEGORY,
        label: 'Open Workspace...'
    };
    export const OPEN_RECENT_WORKSPACE: Command = {
        id: 'che.openRecentWorkspace',
        category: FILE_CATEGORY,
        label: 'Open Recent Workspace...'
    };
    export const CLOSE_CURRENT_WORKSPACE: Command = {
        id: 'che.closeCurrentWorkspace',
        category: WORKSPACE_CATEGORY,
        label: 'Close Workspace'
    };
}

@injectable()
export class CheWorkspaceContribution implements CommandContribution, MenuContribution {

    @inject(CheWorkspaceController) protected readonly workspaceController: CheWorkspaceController;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CheWorkspaceCommands.OPEN_WORKSPACE, {
            execute: () => this.workspaceController.openWorkspace()
        });
        commands.registerCommand(CheWorkspaceCommands.OPEN_RECENT_WORKSPACE, {
            execute: () => this.workspaceController.openRecentWorkspace()
        });
        commands.registerCommand(CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE, {
            execute: () => this.workspaceController.closeCurrentWorkspace()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_WORKSPACE.id
        }, CommonMenus.FILE_OPEN);
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_RECENT_WORKSPACE.id
        }, CommonMenus.FILE_OPEN);
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.CLOSE.id
        }, CommonMenus.FILE_CLOSE);

        menus.registerMenuAction(CommonMenus.FILE_OPEN, {
            commandId: CheWorkspaceCommands.OPEN_WORKSPACE.id,
            label: CheWorkspaceCommands.OPEN_WORKSPACE.label,
            order: 'a10'
        });
        menus.registerMenuAction(CommonMenus.FILE_OPEN, {
            commandId: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE.id,
            label: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE.label,
            order: 'a20'
        });
        menus.registerMenuAction(CommonMenus.FILE_CLOSE, {
            commandId: CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE.id,
            label: CheWorkspaceCommands.CLOSE_CURRENT_WORKSPACE.label
        });
    }
}
