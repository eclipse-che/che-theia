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
import { CheApiService } from '../../common/che-protocol';
import {
    ChePluginService,
    ChePluginRegistry,
    ChePluginRegistries,
    ChePlugin,
    ChePluginMetadata
} from '../../common/che-plugin-protocol';
import { PluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { MessageService, Emitter, Event } from '@theia/core/lib/common';
import { ConfirmDialog } from '@theia/core/lib/browser';
import { ChePluginPreferences } from './che-plugin-preferences';
import { ChePluginFrontentService } from './che-plugin-frontend-service';
import { PreferenceService, PreferenceScope } from '@theia/core/lib/browser/preferences';
import { PluginFilter } from '../../common/plugin/plugin-filter';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';

@injectable()
export class ChePluginManager {

    /**
     * Default plugin registry
     */
    private defaultRegistry: ChePluginRegistry;

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

    @inject(EnvVariablesServer)
    protected readonly envVariablesServer: EnvVariablesServer;

    @inject(ChePluginPreferences)
    protected readonly chePluginPreferences: ChePluginPreferences;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(ChePluginFrontentService)
    protected readonly pluginFrontentService: ChePluginFrontentService;

    /********************************************************************************
     * Changing the Workspace Configuration
     ********************************************************************************/

    protected readonly workspaceConfigurationChangedEvent = new Emitter<void>();

    get onWorkspaceConfigurationChanged(): Event<void> {
        return this.workspaceConfigurationChangedEvent.event;
    }

    /********************************************************************************
     * Changing the list of Plugin Registries
     ********************************************************************************/

    protected readonly pluginRegistryListChangedEvent = new Emitter<void>();

    get onPluginRegistryListChanged(): Event<void> {
        return this.pluginRegistryListChangedEvent.event;
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

        if (!this.registryList) {
            this.registryList = [this.defaultRegistry];
            await this.restoreRegistryList();
        }

        if (!this.installedPlugins) {
            // Get list of plugins from workspace config
            this.installedPlugins = await this.chePluginService.getWorkspacePlugins();
        }
    }

    addRegistry(registry: ChePluginRegistry): void {
        this.registryList.push(registry);

        // Save list of custom repositories to preferences
        const prefs: { [index: string]: string } = {};
        this.registryList.forEach(r => {
            if (r.name !== 'Default') {
                prefs[r.name] = r.uri;
            }
        });

        this.preferenceService.set('chePlugins.repositories', prefs, PreferenceScope.User);

        // notify that plugin registry list has been changed
        this.pluginRegistryListChangedEvent.fire();
    }

    removeRegistry(registry: ChePluginRegistry): void {
        this.registryList = this.registryList.filter(r => r.uri !== registry.uri);
    }

    getRegistryList(): ChePluginRegistry[] {
        return this.registryList;
    }

    /**
     * Udates the Plugin cache
     */
    async updateCache(): Promise<void> {
        await this.initDefaults();

        /**
         * Need to prepare this object to pass the plugins array through RPC.
         *
         * https://github.com/eclipse-theia/theia/issues/4310
         * https://github.com/eclipse-theia/theia/issues/4757
         * https://github.com/eclipse-theia/theia/issues/4343
         */
        const registries: ChePluginRegistries = {};
        for (let i = 0; i < this.registryList.length; i++) {
            const registry = this.registryList[i];
            registries[registry.name] = registry;
        }

        await this.chePluginService.updateCache(registries);
    }

    /**
     * Returns plugin list from active registry
     */
    async getPlugins(filter: string): Promise<ChePlugin[]> {
        await this.initDefaults();

        if (PluginFilter.hasType(filter, '@builtin')) {
            try {
                return await this.getBuiltInPlugins(filter);
            } catch (error) {
                console.log(error);
                return [];
            }
        }

        // Filter plugins if user requested the list of installed plugins
        if (PluginFilter.hasType(filter, '@installed')) {
            return await this.getInstalledPlugins(filter);
        }

        return await this.getAllPlugins(filter);
    }

    private async getBuiltInPlugins(filter: string): Promise<ChePlugin[]> {
        const rawBuiltInPlugins = await this.pluginFrontentService.getBuiltInPlugins(filter);
        return this.groupPlugins(rawBuiltInPlugins);
    }

    /**
     * Returns the list of available plugins for the active plugin registry.
     */
    private async getAllPlugins(filter: string): Promise<ChePlugin[]> {
        // get list of all plugins
        const rawPlugins = await this.chePluginService.getPlugins(filter);

        // group the plugins
        const grouppedPlugins = this.groupPlugins(rawPlugins);

        // prepare list of installed plugins without versions and repository URI
        const installedPluginsInfo = this.getInstalledPluginsInfo();

        // update `installed` field for all the plugin
        // if the plugin is installed, we need to set the proper version
        grouppedPlugins.forEach(plugin => {
            const publisherName = `${plugin.publisher}/${plugin.name}`;
            installedPluginsInfo.forEach(info => {
                if (info.publisherName === publisherName) {
                    // set plugin is installed
                    plugin.installed = true;
                    // set intalled version
                    plugin.version = info.version;
                }
            });
        });

        return grouppedPlugins;
    }

    /**
     * Returns the list of installed plugins
     */
    private async getInstalledPlugins(filter: string): Promise<ChePlugin[]> {
        const rawPlugins: ChePluginMetadata[] = await this.chePluginService.getPlugins(filter);

        // group the plugins
        const grouppedPlugins = this.groupPlugins(rawPlugins);

        // prepare list of installed plugins without versions and repository URI
        const installedPluginsInfo = this.getInstalledPluginsInfo();

        const installedPlugins: ChePlugin[] = [];

        // update `installed` field for all the plugin
        // if the plugin is installed, we ned to set the proper version
        grouppedPlugins.forEach(plugin => {
            const publisherName = `${plugin.publisher}/${plugin.name}`;
            installedPluginsInfo.forEach(info => {
                if (info.publisherName === publisherName) {
                    // set plugin is installed
                    plugin.installed = true;
                    // set intalled version
                    plugin.version = info.version;

                    installedPlugins.push(plugin);
                }
            });
        });

        return installedPlugins;
    }

    /**
     * Returns list of installed plugins including installed version.
     *
     * Plugin should be without version and must not include plugin source.
     *
     * Plugin record
     *     camel-tooling/vscode-apache-camel/0.0.14
     * must be replaced on
     *     camel-tooling/vscode-apache-camel
     *
     * Plugin record
     *     https://raw.githubusercontent.com/vitaliy-guliy/che-theia-plugin-registry/master/plugins/eclipse-che/tree-view-sample-plugin/0.0.1/meta.yaml
     * must be replaced on
     *     eclipse-che/tree-view-sample-plugin
     */
    private getInstalledPluginsInfo(): { publisherName: string, version: string }[] {
        // prepare the list of registries
        // we need to remove the registry URI from the start of the plugin
        const registries: string[] = [];
        this.registryList.forEach(registry => {
            let uri = registry.uri;
            if (uri === this.defaultRegistry.uri) {
                return;
            }

            if (uri.endsWith('.json')) {
                uri = uri.substring(0, uri.lastIndexOf('/') + 1);
            } else if (!uri.endsWith('/')) {
                uri += '/';
            }

            registries.push(uri);
        });

        const plugins: { publisherName: string, version: string }[] = [];
        this.installedPlugins.forEach(plugin => {
            if (plugin.endsWith('/meta.yaml')) {
                // it's non default registry
                // we have to remove '/meta.yaml' from the end
                plugin = plugin.substring(0, plugin.lastIndexOf('/'));
            }

            const version = plugin.substring(plugin.lastIndexOf('/') + 1);

            // remove the version by deleting all the text after the last '/' character, including '/'
            plugin = plugin.substring(0, plugin.lastIndexOf('/'));

            // remove registry URI from the start of the plugin
            registries.forEach(r => {
                if (plugin.startsWith(r)) {
                    plugin = plugin.substring(r.length);
                }
            });

            plugins.push({
                publisherName: plugin,
                version
            });
        });

        return plugins;
    }

    /**
     * Groups all versions of the same plugin in one structure.
     */
    private groupPlugins(rawPlugins: ChePluginMetadata[]): ChePlugin[] {
        const pluginMap: { [pluginKey: string]: ChePlugin } = {};

        rawPlugins.forEach(plugin => {
            const pluginKey = `${plugin.publisher}/${plugin.name}`;
            let installationItem = pluginMap[pluginKey];
            if (!installationItem) {
                installationItem = {
                    publisher: plugin.publisher,
                    name: plugin.name,
                    version: plugin.version,
                    installed: false,
                    versionList: {}
                };

                pluginMap[pluginKey] = installationItem;
            } else {
                installationItem.version = plugin.version;
            }

            installationItem.versionList[plugin.version] = plugin;
        });

        const chePlugins: ChePlugin[] = [];
        for (const key in pluginMap) {
            if (pluginMap.hasOwnProperty(key)) {
                chePlugins.push(pluginMap[key]);
            }
        }

        return chePlugins;
    }

    /**
     * Installs the plugin.
     */
    async install(plugin: ChePlugin): Promise<boolean> {
        const metadata = plugin.versionList[plugin.version];

        try {
            // add the plugin to workspace configuration
            await this.chePluginService.addPlugin(metadata.key);
            this.messageService.info(`Plugin '${metadata.publisher}/${metadata.name}/${metadata.version}' has been successfully installed`);

            // add the plugin to the list of workspace plugins
            this.installedPlugins.push(metadata.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to install plugin '${metadata.publisher}/${metadata.name}/${metadata.version}'. ${error.message}`);
            return false;
        }
    }

    /**
     * Removes the plugin.
     */
    async remove(plugin: ChePlugin): Promise<boolean> {
        const metadata = plugin.versionList[plugin.version];

        try {
            // remove the plugin from workspace configuration
            await this.chePluginService.removePlugin(metadata.key);
            this.messageService.info(`Plugin '${metadata.publisher}/${metadata.name}/${metadata.version}' has been successfully removed`);

            // remove the plugin from the list of workspace plugins
            this.installedPlugins = this.installedPlugins.filter(p => p !== metadata.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to remove plugin '${metadata.publisher}/${metadata.name}/${metadata.version}'. ${error.message}`);
            return false;
        }
    }

    /**
     * Changes the plugin version.
     */
    async changeVersion(plugin: ChePlugin, versionBefore: string): Promise<boolean> {
        const metadataBefore = plugin.versionList[versionBefore];
        const metadata = plugin.versionList[plugin.version];
        try {
            await this.chePluginService.updatePlugin(metadataBefore.key, metadata.key);

            this.messageService.info(`Plugin '${metadata.publisher}/${metadata.name}' has been successfully updated`);

            // remove old plugin from the list of workspace plugins
            this.installedPlugins = this.installedPlugins.filter(p => p !== metadataBefore.key);

            // add new plugin to the list of workspace plugins
            this.installedPlugins.push(metadata.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to upate plugin '${metadata.publisher}/${metadata.name}'. ${error.message}`);
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
    checkVsCodeExtension(input: string): string | undefined {
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

    private notifyWorkspaceConfigurationChanged(): void {
        setTimeout(() => {
            this.workspaceConfigurationChangedEvent.fire();
        }, 500);
    }

    /**
     * Checks whether IDE is opened inside frame in dashboard.
     * If yes, IDE can send request to the dashboard to restart the workspace.
     */
    restartEnabled(): boolean {
        return window.parent !== window;
    }

    async restartWorkspace(): Promise<void> {
        const confirm = new ConfirmDialog({
            title: 'Restart Workspace',
            msg: 'Are you sure you want to restart your workspace?',
            ok: 'Restart'
        });

        if (await confirm.open()) {
            // get workspace ID
            const cheWorkspaceID = await this.envVariablesServer.getValue('CHE_WORKSPACE_ID');
            // get machine token
            const cheMachineToken = await this.envVariablesServer.getValue('CHE_MACHINE_TOKEN');
            if (cheWorkspaceID && cheWorkspaceID.value) {
                this.messageService.info('Workspace is restarting...');
                const cheMachineTokenValue = cheMachineToken && cheMachineToken.value ? cheMachineToken.value : '';
                // ask Dashboard to restart the workspace giving him workspace ID & machine token
                window.parent.postMessage(`restart-workspace:${cheWorkspaceID.value}:${cheMachineTokenValue}`, '*');
            }
        }
    }

}
