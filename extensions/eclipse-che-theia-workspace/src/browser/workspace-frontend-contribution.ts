/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import {
    CommonMenus, LabelProvider, KeybindingRegistry, KeybindingContribution
} from '@theia/core/lib/browser';
import { WorkspaceCommands, WorkspaceService } from '@theia/workspace/lib/browser';
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class WorkspaceFrontendContribution implements CommandContribution, KeybindingContribution, MenuContribution {

    @inject(LabelProvider) protected readonly labelProvider: LabelProvider;
    @inject(CommandRegistry) protected readonly commandRegistry: CommandRegistry;
    @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;

    @inject(ContextKeyService)
    protected readonly contextKeyService: ContextKeyService;

    registerCommands(commands: CommandRegistry): void {
        // Not visible/enabled on Windows/Linux in electron.
        commands.unregisterCommand(WorkspaceCommands.OPEN);
        // Visible/enabled only on Windows/Linux in electron.
        commands.unregisterCommand(WorkspaceCommands.OPEN_FILE);
        // Visible/enabled only on Windows/Linux in electron.
        commands.unregisterCommand(WorkspaceCommands.OPEN_FOLDER);
        commands.unregisterCommand(WorkspaceCommands.OPEN_RECENT_WORKSPACE);
        commands.unregisterCommand(WorkspaceCommands.CLOSE);
        commands.unregisterCommand(WorkspaceCommands.OPEN_RECENT_WORKSPACE);
        commands.unregisterCommand(WorkspaceCommands.SAVE_WORKSPACE_AS);

        commands.registerCommand({
            id: 'che.workspace.addFolder'
        }, {
                execute: async (uri: URI) => await this.workspaceService.addRoot(uri)
            });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN.id,
        }, CommonMenus.FILE_OPEN);
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_FILE.id,
        }, CommonMenus.FILE_OPEN);
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_FOLDER.id
        });
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_WORKSPACE.id
        });
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.OPEN_RECENT_WORKSPACE.id
        });
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.SAVE_WORKSPACE_AS.id
        });
        menus.unregisterMenuAction({
            commandId: WorkspaceCommands.CLOSE.id
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.unregisterKeybinding({
            command: WorkspaceCommands.OPEN.id,
            keybinding: 'ctrlcmd+alt+o',
        });
        keybindings.unregisterKeybinding({
            command: WorkspaceCommands.OPEN_FOLDER.id,
            keybinding: 'ctrl+k ctrl+o',
        });
        keybindings.unregisterKeybinding({
            command: WorkspaceCommands.OPEN_WORKSPACE.id,
            keybinding: 'ctrlcmd+alt+w',
        });
        keybindings.unregisterKeybinding({
            command: WorkspaceCommands.OPEN_RECENT_WORKSPACE.id,
            keybinding: 'ctrlcmd+alt+r',
        });
    }
}
