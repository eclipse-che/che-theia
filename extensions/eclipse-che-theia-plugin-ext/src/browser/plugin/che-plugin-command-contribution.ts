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
import { ChePluginRegistry } from '../../common/che-protocol';
import { ChePluginManager } from './che-plugin-manager';
import { CommonMenus, QuickInputService } from '@theia/core/lib/browser';
import { MonacoQuickOpenService } from '@theia/monaco/lib/browser/monaco-quick-open-service';
import { QuickOpenModel, QuickOpenItem, QuickOpenMode } from '@theia/core/lib/browser/quick-open/quick-open-model';
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

    export const CHANGE_REGISTRY = cmd('change-registry', 'Change Registry');
    export const ADD_REGISTRY = cmd('add-registry', 'Add Registry');
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
        commands.registerCommand(ChePluginManagerCommands.CHANGE_REGISTRY, {
            execute: () => this.changePluginRegistry()
        });

        commands.registerCommand(ChePluginManagerCommands.ADD_REGISTRY, {
            execute: () => this.addPluginRegistry()
        });
    }

    //
    async showAvailablePlugins() {
        this.chePluginManager.changeFilter('', true);
    }

    // @installed
    async showInstalledPlugins() {
        this.chePluginManager.changeFilter('@installed', true);
    }

    // @builtin
    // Displays a list of built in plugins provided inside Theia editor container.
    // Will be implemented soon.
    async showBuiltInPlugins() {
        this.chePluginManager.changeFilter('@builtin', true);
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
        this.chePluginManager.changeRegistry(registry);
    }

    private async pickPluginRegistry(): Promise<ChePluginRegistry | undefined> {
        const registryList = this.chePluginManager.getRegistryList();

        return new Promise<ChePluginRegistry | undefined>((resolve, reject) => {
            // Return undefined if registry list is empty
            if (!registryList || registryList.length === 0) {
                resolve(undefined);
                return;
            }

            // Active before appearing the pick menu
            const activeElement: HTMLElement | undefined = window.document.activeElement as HTMLElement;

            // ChePluginRegistry to be returned
            let returnValue: ChePluginRegistry | undefined;

            const items = registryList.map(registry =>
                new QuickOpenItem({
                    label: registry.name,
                    detail: registry.uri,
                    run: mode => {
                        if (mode === QuickOpenMode.OPEN) {
                            returnValue = {
                                name: registry.name,
                                uri: registry.uri
                            } as ChePluginRegistry;
                        }
                        return true;
                    }
                })
            );

            // Create quick open model
            const model = {
                onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                    acceptor(items);
                }
            } as QuickOpenModel;

            // Show pick menu
            this.monacoQuickOpenService.open(model, {
                fuzzyMatchLabel: true,
                fuzzyMatchDetail: true,
                fuzzyMatchDescription: true,
                onClose: () => {
                    if (activeElement) {
                        activeElement.focus();
                    }

                    resolve(returnValue);
                }
            });
        });
    }

    async changePluginRegistry(): Promise<void> {
        const registry = await this.pickPluginRegistry();
        if (registry) {
            this.chePluginManager.changeRegistry(registry);
        }
    }

}
