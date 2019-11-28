/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
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
import { MenuModelRegistry, CommandRegistry, CommandContribution } from '@theia/core/lib/common';
import { MessageService, Command } from '@theia/core/lib/common';
import { ChePluginManager } from './che-plugin-manager';
import { CommonMenus, QuickInputService } from '@theia/core/lib/browser';
import { MonacoQuickOpenService } from '@theia/monaco/lib/browser/monaco-quick-open-service';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';

function cmd(id: string, label: string): Command {
    return {
        id: `${ChePluginManagerCommands.PLUGIN_MANAGER_ID}:${id}`,
        category: ChePluginManagerCommands.PLUGIN_MANAGER_CATEGORY,
        label: label
    };
}

export namespace ChePluginManagerCommands {

    export const PLUGIN_MANAGER_ID = 'plugin-manager';
    export const PLUGIN_MANAGER_CATEGORY = 'Plugin Manager';

    export const SHOW_AVAILABLE_PLUGINS = cmd('show-available-plugins', 'Show Available Plugins');
    export const SHOW_INSTALLED_PLUGINS = cmd('show-installed-plugins', 'Show Installed Plugins');
    export const SHOW_BUILT_IN_PLUGINS = cmd('show-built-in-plugins', 'Show Built-in Plugins');

    export const ADD_REGISTRY = cmd('add-registry', 'Add Registry');
    export const REFRESH = cmd('refresh', 'Refresh');
}

@injectable()
export class ChePluginCommandContribution implements CommandContribution {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(MonacoQuickOpenService)
    protected readonly monacoQuickOpenService: MonacoQuickOpenService;

    @inject(ChePluginManager)
    protected readonly chePluginManager: ChePluginManager;

    /**
     * TEMPORARY SOLUTION
     *
     * Following code removes 'View/Plugins' menu item and the command that displays/hides Plugins view.
     * In the future we will try to refactor Che Plugins view and move it to the 'plugin-ext'.
     */
    constructor(
        @inject(MenuModelRegistry) menuModelRegistry: MenuModelRegistry,
        @inject(CommandRegistry) commandRegistry: CommandRegistry,
        @inject(FrontendApplicationStateService) stateService: FrontendApplicationStateService
    ) {
        stateService.reachedState('initialized_layout').then(() => {
            menuModelRegistry.unregisterMenuAction('pluginsView:toggle', CommonMenus.VIEW_VIEWS);
            commandRegistry.unregisterCommand('pluginsView:toggle');
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(ChePluginManagerCommands.ADD_REGISTRY, {
            execute: () => this.addPluginRegistry()
        });
    }

    /**
     * Displays prompt to add a new plugin registry.
     * Makes new plugin registry active and displays a list of plugins from this registry.
     */
    async addPluginRegistry(): Promise<void> {
        const name = await this.quickInputService.open({
            prompt: 'Name of your registry'
        });

        if (!name) {
            return;
        }

        const uri = await this.quickInputService.open({
            prompt: 'Registry URI'
        });

        if (!uri) {
            return;
        }

        const registry = {
            name,
            uri
        };

        this.chePluginManager.addRegistry(registry);
    }

}
