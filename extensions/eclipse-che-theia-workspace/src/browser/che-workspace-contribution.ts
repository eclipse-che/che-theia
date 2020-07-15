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
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { WorkspaceCommands } from '@theia/workspace/lib/browser/workspace-commands';
import { QuickOpenCheWorkspace } from './che-quick-open-workspace';
import { Command } from '@theia/core/lib/common/command';

export namespace CheWorkspaceCommands {

    const FILE_CATEGORY = 'File';

    export const OPEN_RECENT_WORKSPACE: Command = {
        id: 'che.openRecentWorkspace',
        category: FILE_CATEGORY,
        label: 'Open Recent Workspace...'
    };
}

@injectable()
export class CheWorkspaceContribution implements CommandContribution, MenuContribution {

    @inject(QuickOpenCheWorkspace) protected readonly quickOpenWorkspace: QuickOpenCheWorkspace;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CheWorkspaceCommands.OPEN_RECENT_WORKSPACE, {
            execute: () => this.quickOpenWorkspace.select()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_RECENT_WORKSPACE.id
        }, CommonMenus.FILE_OPEN);

        menus.registerMenuAction(CommonMenus.FILE_OPEN, {
            commandId: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE.id,
            label: CheWorkspaceCommands.OPEN_RECENT_WORKSPACE.label,
            order: 'a20'
        });
    }
}
