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

import {
    ChePluginRegistry,
    ChePluginMetadata,
    ChePluginService,
    CheApiService
} from '../../common/che-protocol';

import { PluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { MessageService, Emitter, Event } from '@theia/core/lib/common';
import { ConfirmDialog } from '@theia/core/lib/browser';

import { ChePluginPreferences } from './che-plugin-preferences';
import { ChePluginFrontentService } from './che-plugin-frontend-service';
import { PreferenceService, PreferenceScope } from '@theia/core/lib/browser/preferences';
import { PluginFilter } from '../../common/plugin/plugin-filter';

@injectable()
export class ChePluginManager {

    /**
     * Default plugin registry
     */
    private defaultRegistry: ChePluginRegistry;

    /**
     * Active plugin registry.
     * Plugin widget should display the list of plugins from this registry.
     */
    private activeRegistry: ChePluginRegistry;

    /**
     * Registry list
     */
    private registryList: ChePluginRegistry[];

    /**
     * List of installed plugins.
     * Initialized by plugins received from workspace config.
     */
    private installedPlugins: string[];

    @inject(ChePluginService)
    protected readonly chePluginService: ChePluginService;

    @inject(PluginServer)
    protected readonly pluginServer: PluginServer;

    @inject(CheApiService)
    protected readonly cheApiService: CheApiService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(ChePluginPreferences)
    protected readonly chePluginPreferences: ChePluginPreferences;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(ChePluginFrontentService)
    protected readonly pluginFrontentService: ChePluginFrontentService;

    protected readonly pluginRegistryChanged = new Emitter<ChePluginRegistry>();

    protected readonly workspaceConfigurationChanged = new Emitter<boolean>();

    get onPluginRegistryChanged(): Event<ChePluginRegistry> {
        return this.pluginRegistryChanged.event;
    }

    get onWorkspaceConfigurationChanged(): Event<boolean> {
        return this.workspaceConfigurationChanged.event;
    }

    /**
     * Restores list of custom registries
     */
    private async restoreRegistryList(): Promise<void> {
        // wait for preference service
        await this.preferenceService.ready;

        const prefs = this.chePluginPreferences['chePlugins.repositories'];
        if (prefs) {
            Object.keys(prefs).forEach(repoName => {
                const uri = prefs[repoName];

                const registry = this.registryList.find(r => r.uri === uri);
                if (registry === undefined) {
                    this.registryList.push({
                        name: repoName,
                        uri: uri
                    });
                }
            });
        }
    }

    private async initDefaults(): Promise<void> {
        if (!this.defaultRegistry) {
            this.defaultRegistry = await this.chePluginService.getDefaultRegistry();
        }

        if (!this.activeRegistry) {
            this.activeRegistry = this.defaultRegistry;
        }

        if (!this.registryList) {
            this.registryList = [this.defaultRegistry];
            await this.restoreRegistryList();
        }

        if (!this.installedPlugins) {
            // Get list of plugins from workspace config
            this.installedPlugins = await this.chePluginService.getWorkspacePlugins();
        }
    }

    getDefaultRegistry(): ChePluginRegistry {
        return this.defaultRegistry;
    }

    changeRegistry(registry: ChePluginRegistry): void {
        this.activeRegistry = registry;
        this.pluginRegistryChanged.fire(registry);
    }

    addRegistry(registry: ChePluginRegistry): void {
        this.registryList.push(registry);

        // Save list of custom repositories to preferences
        const prefs = {};
        this.registryList.forEach(r => {
            if (r.name !== 'Default') {
                prefs[r.name] = r.uri;
            }
        });

        this.preferenceService.set('chePlugins.repositories', prefs, PreferenceScope.User);
    }

    removeRegistry(registry: ChePluginRegistry): void {
        this.registryList = this.registryList.filter(r => r.uri !== registry.uri);
    }

    getRegistryList(): ChePluginRegistry[] {
        return this.registryList;
    }

    /**
     * Returns plugin list from active registry
     */
    async getPlugins(filter: string): Promise<ChePluginMetadata[]> {
        await this.initDefaults();

        if (PluginFilter.hasType(filter, '@builtin')) {
            return await this.pluginFrontentService.getBuiltInPlugins(filter);
        }

        return await this.chePluginService.getPlugins(this.activeRegistry, filter);
    }

    isPluginInstalled(plugin: ChePluginMetadata): boolean {
        return this.installedPlugins.indexOf(plugin.key) >= 0;
    }

    async install(plugin: ChePluginMetadata): Promise<boolean> {
        try {
            // add the plugin to workspace configuration
            await this.chePluginService.addPlugin(plugin.key);
            this.messageService.info(`Plugin '${plugin.publisher}/${plugin.name}/${plugin.version}' has been successfully installed`);

            // add the plugin to the list of workspace plugins
            this.installedPlugins.push(plugin.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to install plugin '${plugin.publisher}/${plugin.name}/${plugin.version}'. ${error.message}`);
            return false;
        }
    }

    async remove(plugin: ChePluginMetadata): Promise<boolean> {
        try {
            // remove the plugin from workspace configuration
            await this.chePluginService.removePlugin(plugin.key);
            this.messageService.info(`Plugin '${plugin.publisher}/${plugin.name}/${plugin.version}' has been successfully removed`);

            // remove the plugin from the list of workspace plugins
            this.installedPlugins = this.installedPlugins.filter(p => p !== plugin.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to remove plugin '${plugin.publisher}/${plugin.name}/${plugin.version}'. ${error.message}`);
            return false;
        }
    }

    private getIdPublisher(input: string): string {
        if (input.startsWith('ext install ')) {
            // check for 'ext install rebornix.Ruby'
            return input.substring('ext install '.length);
        } else if (input.startsWith('vscode:extension/')) {
            // check for 'vscode:extension/rebornix.Ruby'
            return input.substring('vscode:extension/'.length);
        }

        return '';
    }

    /**
     * Installs VS Code extension.
     */
    async installVSCodeExtension(command: string): Promise<boolean> {
        const idPublisher = this.getIdPublisher(command);
        try {
            await this.pluginServer.deploy(command);
            this.messageService.info(`VS Code plugin '${idPublisher}' has been installed`);
            return true;
        } catch (error) {
            this.messageService.error(`Unable to install VS Code plugin '${idPublisher}'`);
        }

        return false;
    }

    /**
     * Determines whether the `input` is a command to install VS Code extension.
     *
     * Returns VS Code extension `publisher.ID`
     */
    checkVsCodeExtension(input: string): string {
        try {
            const idPublisher = this.getIdPublisher(input);
            if (idPublisher) {
                const parts = idPublisher.split('.');
                if (parts.length === 2 && parts[0] && parts[1]) {
                    return idPublisher;
                }
            }
        } catch (error) {
            console.log(error);
        }

        return undefined;
    }

    private notifyWorkspaceConfigurationChanged() {
        setTimeout(() => {
            this.workspaceConfigurationChanged.fire(true);
        }, 500);
    }

    async restartWorkspace(): Promise<void> {
        const confirm = new ConfirmDialog({
            title: 'Restart Workspace',
            msg: 'Are you sure you want to restart your workspace?',
            ok: 'Restart'
        });

        if (await confirm.open()) {
            this.messageService.info('Workspace is restarting...');

            try {
                await this.cheApiService.stop();
                window.location.href = document.referrer;
            } catch (error) {
                this.messageService.error(`Unable to restart your workspace. ${error.message}`);
            }
        }
    }

    protected readonly filterChanged = new Emitter<string>();

    get onFilterChanged(): Event<string> {
        return this.filterChanged.event;
    }

    async changeFilter(filter: string, sendNotification: boolean = false) {
        if (sendNotification) {
            this.filterChanged.fire(filter);
        }
    }

}
