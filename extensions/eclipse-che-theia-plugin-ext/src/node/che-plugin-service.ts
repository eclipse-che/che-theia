/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheApiService, WorkspaceSettings } from '../common/che-protocol';
import {
    ChePluginService,
    ChePluginServiceClient,
    ChePluginRegistry,
    ChePluginRegistries,
    ChePluginMetadata
} from '../common/che-plugin-protocol';
import { injectable, interfaces } from 'inversify';
import axios, { AxiosInstance } from 'axios';
import { che as cheApi } from '@eclipse-che/api';
import URI from '@theia/core/lib/common/uri';
import { PluginFilter } from '../common/plugin/plugin-filter';
import * as fs from 'fs-extra';
import * as https from 'https';
import { SS_CRT_PATH } from './che-https';

const yaml = require('js-yaml');

/**
 * Describes plugin inside plugin list
 * https://che-plugin-registry.openshift.io/plugins/
 */
export interface ChePluginMetadataInternal {
    id: string,
    displayName: string,
    version: string,
    type: string,
    name: string,
    description: string,
    publisher: string,
    links: {
        'self': string,
        [link: string]: string
    }
}

@injectable()
export class ChePluginServiceImpl implements ChePluginService {

    private axiosInstance: AxiosInstance;

    private cheApiService: CheApiService;

    private defaultRegistry: ChePluginRegistry;

    private client: ChePluginServiceClient | undefined;

    private cachedPlugins: ChePluginMetadata[] = [];

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    setClient(client: ChePluginServiceClient) {
        this.client = client;
    }

    disconnectClient(client: ChePluginServiceClient) {
        this.client = undefined;
    }

    dispose() {
    }

    async getDefaultRegistry(): Promise<ChePluginRegistry> {
        if (this.defaultRegistry) {
            return this.defaultRegistry;
        }

        try {
            const workspaceSettings: WorkspaceSettings = await this.cheApiService.getWorkspaceSettings();
            if (workspaceSettings && workspaceSettings['cheWorkspacePluginRegistryUrl']) {
                let uri = workspaceSettings['cheWorkspacePluginRegistryUrl'];

                if (!uri.endsWith('/plugins/')) {
                    if (uri.endsWith('/')) {
                        uri = uri.substring(0, uri.length - 1);
                    }

                    if (!uri.endsWith('/plugins')) {
                        uri += '/plugins/';
                    }
                }
                this.defaultRegistry = {
                    name: 'Eclipse Che plugins',
                    uri: uri
                };

                return this.defaultRegistry;
            }

            return Promise.reject('Plugin registry URI is not set.');
        } catch (error) {
            console.error(error);
            return Promise.reject(`Unable to get default plugin registry URI. ${error.message}`);
        }
    }

    private getAxiosInstance(): AxiosInstance {
        if (!this.axiosInstance) {
            if (fs.pathExistsSync(SS_CRT_PATH)) {
                const agent = new https.Agent({
                    ca: fs.readFileSync(SS_CRT_PATH)
                });
                this.axiosInstance = axios.create({ httpsAgent: agent });
            } else {
                this.axiosInstance = axios;
            }
            this.axiosInstance.defaults.headers.common['Cache-Control'] = 'no-cache';
        }

        return this.axiosInstance;
    }

    /**
     * Removes plugins with type 'Che Editor'
     */
    squeezeOutEditors(plugins: ChePluginMetadata[], filter: string): ChePluginMetadata[] {
        return plugins.filter(plugin => 'Che Editor' !== plugin.type);
    }

    async sleep(miliseconds: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, miliseconds);
        });
    }

    /**
     * Updates the plugin cache
     *
     * @param registryList list of plugin registries
     */
    async updateCache(registries: ChePluginRegistries): Promise<void> {
        if (!this.client) {
            return;
        }

        // clear cache
        this.cachedPlugins = [];

        // ensure default plugin registry URI is set
        if (!this.defaultRegistry) {
            await this.getDefaultRegistry();
        }

        let availablePlugins = 0;
        await this.client.notifyPluginCacheSizeChanged(0);

        for (const registryName in registries) {
            if (!registries.hasOwnProperty(registryName)) {
                continue;
            }

            const registry = registries[registryName];
            try {
                // Get list of ChePluginMetadataInternal from plugin registry
                const registryPlugins = await this.loadPluginList(registry);
                availablePlugins += registryPlugins.length;
                await this.client.notifyPluginCacheSizeChanged(availablePlugins);

                // Plugin key used to specify a plugin in the devfile.
                // It can be short:
                //      {publisher}/{pluginName}/{version}
                // or long, including the path to plugin meta.yaml
                //      {http/https}://{host}/{path}/{publisher}/{pluginName}/{version}
                const longKeyFormat = registry.uri !== this.defaultRegistry.uri;

                for (let pIndex = 0; pIndex < registryPlugins.length; pIndex++) {
                    const metadataInternal: ChePluginMetadataInternal = registryPlugins[pIndex];
                    const pluginYamlURI = this.getPluginYampURI(registry, metadataInternal);

                    try {
                        const pluginMetadata = await this.loadPluginMetadata(pluginYamlURI!, longKeyFormat);
                        this.cachedPlugins.push(pluginMetadata);
                        await this.client.notifyPluginCached(this.cachedPlugins.length);
                    } catch (error) {
                        console.log('Unable go get plugin metadata from ' + pluginYamlURI);
                        await this.client.invaligPluginFound(pluginYamlURI);
                    }
                }
            } catch (error) {
                console.log('Cannot access the registry', error);
                await this.client.invalidRegistryFound(registry);
            }
        }

        // notify client that caching the plugins has been finished
        await this.client.notifyCachingComplete();
    }

    /**
     * Returns a list of available plugins on the plugin registry.
     *
     * @param filter filter
     * @return list of available plugins
     */
    async getPlugins(filter: string): Promise<ChePluginMetadata[]> {
        let pluginList: ChePluginMetadata[] = [...this.cachedPlugins];

        // filter plugins
        if (filter) {
            pluginList = PluginFilter.filterPlugins(pluginList, filter);
        }

        // remove editors
        return this.squeezeOutEditors(pluginList, filter);
    }

    /**
     * Loads list of plugins from plugin registry.
     *
     * @param registry ChePluginRegistry plugin registry
     * @return list of available plugins
     */
    private async loadPluginList(registry: ChePluginRegistry): Promise<ChePluginMetadataInternal[]> {
        return (await this.getAxiosInstance().get<ChePluginMetadataInternal[]>(registry.uri)).data;
    }

    /**
     * Creates an URI to plugin metadata yaml file.
     *
     * @param registry: ChePluginRegistry plugin registry
     * @param plugin plugin metadata
     * @return uri to plugin yaml file
     */
    private getPluginYampURI(registry: ChePluginRegistry, plugin: ChePluginMetadataInternal): string {
        if (plugin.links && plugin.links.self) {
            const self: string = plugin.links.self;
            if (self.startsWith('/')) {
                const uri = new URI(registry.uri);
                return `${uri.scheme}://${uri.authority}${self}`;
            } else {
                const base = this.getBaseDirectory(registry);
                return `${base}${self}`;
            }
        } else {
            const base = this.getBaseDirectory(registry);
            return `${base}/${plugin.id}/meta.yaml`;
        }
    }

    private getBaseDirectory(registry: ChePluginRegistry): string {
        let uri = registry.uri;

        if (uri.endsWith('.json')) {
            uri = uri.substring(0, uri.lastIndexOf('/') + 1);
        } else {
            if (!uri.endsWith('/')) {
                uri += '/';
            }
        }

        return uri;
    }

    private async loadPluginYaml(yamlURI: string): Promise<ChePluginMetadata> {
        let err;
        try {
            const data = (await this.getAxiosInstance().get<ChePluginMetadata[]>(yamlURI)).data;
            return yaml.safeLoad(data);
        } catch (error) {
            console.error(error);
            err = error;
        }

        try {
            if (!yamlURI.endsWith('/')) {
                yamlURI += '/';
            }
            yamlURI += 'meta.yaml';
            const data = (await this.getAxiosInstance().get<ChePluginMetadata[]>(yamlURI)).data;
            return yaml.safeLoad(data);
        } catch (error) {
            console.error(error);
            return Promise.reject('Unable to load plugin metadata. ' + err.message);
        }
    }

    private async loadPluginMetadata(yamlURI: string, longKeyFormat: boolean): Promise<ChePluginMetadata> {
        try {
            const props: ChePluginMetadata = await this.loadPluginYaml(yamlURI);

            let key = `${props.publisher}/${props.name}/${props.version}`;
            if (longKeyFormat) {
                if (yamlURI.endsWith(key)) {
                    const uri = yamlURI.substring(0, yamlURI.length - key.length);
                    key = `${uri}${props.publisher}/${props.name}/${props.version}`;
                } else if (yamlURI.endsWith(`${key}/meta.yaml`)) {
                    const uri = yamlURI.substring(0, yamlURI.length - `${key}/meta.yaml`.length);
                    key = `${uri}${props.publisher}/${props.name}/${props.version}`;
                }
            }

            return {
                publisher: props.publisher,
                name: props.name,
                version: props.version,
                type: props.type,
                displayName: props.displayName,
                title: props.title,
                description: props.description,
                icon: props.icon,
                url: props.url,
                repository: props.repository,
                firstPublicationDate: props.firstPublicationDate,
                category: props.category,
                latestUpdateDate: props.latestUpdateDate,
                key: key,
                builtIn: false
            };

        } catch (error) {
            console.log(`Cannot get ${yamlURI}`, error);
            return Promise.reject('Unable to load plugin metadata. ' + error.message);
        }
    }

    /**
     * Removes /meta.yaml from the end of the plugin ID (reference)
     */
    normalizeId(id: string): string {
        if ((id.startsWith('http://') || id.startsWith('https://')) && id.endsWith('/meta.yaml')) {
            id = id.substring(0, id.length - '/meta.yaml'.length);
        }

        return id;
    }

    /**
     * Creates a plugin component for the given plugin ID (reference)
     */
    createPluginComponent(id: string): cheApi.workspace.devfile.Component {
        if (id.startsWith('http://') || id.startsWith('https://')) {
            return {
                type: 'chePlugin',
                reference: `${id}/meta.yaml`
            };
        } else {
            return {
                type: 'chePlugin',
                id: `${id}`
            };
        }
    }

    /**
     * Returns list of plugins described in workspace configuration.
     */
    async getWorkspacePlugins(): Promise<string[]> {
        const workspace: cheApi.workspace.Workspace = await this.cheApiService.currentWorkspace();

        if (workspace.config) {
            if (workspace.config.attributes && workspace.config.attributes['plugins']) {
                const plugins = workspace.config.attributes['plugins'];
                return plugins.split(',');
            } else {
                return [];
            }
        } else if (workspace.devfile) {
            const plugins: string[] = [];

            workspace.devfile.components!.forEach(component => {
                if (component.type === 'chePlugin') {
                    if (component.reference) {
                        plugins.push(this.normalizeId(component.reference));
                    } else if (component.id) {
                        plugins.push(component.id);
                    }
                }
            });

            return plugins;
        }

        return Promise.reject('Unable to get Workspace plugins');
    }

    /**
     * Sets new list of plugins to workspace configuration.
     */
    async setWorkspacePlugins(plugins: string[]): Promise<void> {
        const workspace: cheApi.workspace.Workspace = await this.cheApiService.currentWorkspace();
        if (!workspace.devfile!.components) {
            workspace.devfile!.components = [];
        }

        if (workspace.config) {
            workspace.config.attributes = workspace.config.attributes || {};
            workspace.config.attributes['plugins'] = plugins.join(',');

        } else if (workspace.devfile) {
            const components: cheApi.workspace.devfile.Component[] = [];
            workspace.devfile.components!.forEach((component: cheApi.workspace.devfile.Component) => {
                if (component.type === 'chePlugin') {
                    components.push(component);
                }
            });

            components.forEach((component: cheApi.workspace.devfile.Component) => {
                const id = component.reference ? this.normalizeId(component.reference) : component.id;
                const foundIndex = plugins.indexOf(id!);
                if (foundIndex >= 0) {
                    plugins.splice(foundIndex, 1);
                } else {
                    workspace.devfile!.components!.splice(workspace.devfile!.components!.indexOf(component), 1);
                }
            });

            plugins.forEach((plugin: string) => {
                workspace.devfile!.components!.push(this.createPluginComponent(plugin));
            });
        }

        await this.cheApiService.updateWorkspace(workspace.id!, workspace);
    }

    /**
     * Adds a plugin to workspace configuration.
     */
    async addPlugin(pluginKey: string): Promise<void> {
        try {
            const plugins: string[] = await this.getWorkspacePlugins();
            plugins.push(pluginKey);
            await this.setWorkspacePlugins(plugins);
        } catch (error) {
            console.error(error);
            return Promise.reject('Unable to install plugin ' + pluginKey + ' ' + error.message);
        }
    }

    /**
     * Removes a plugin from workspace configuration.
     */
    async removePlugin(pluginKey: string): Promise<void> {
        try {
            const plugins: string[] = await this.getWorkspacePlugins();
            const filteredPlugins = plugins.filter(p => p !== pluginKey);
            await this.setWorkspacePlugins(filteredPlugins);
        } catch (error) {
            console.error(error);
            return Promise.reject('Unable to remove plugin ' + pluginKey + ' ' + error.message);
        }
    }

    async updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void> {
        try {
            // get existing plugins
            const plugins: string[] = await this.getWorkspacePlugins();

            // remove old plugin key
            const filteredPlugins = plugins.filter(p => p !== oldPluginKey);

            // add new plugin key
            filteredPlugins.push(newPluginKey);

            // set plugins
            await this.setWorkspacePlugins(filteredPlugins);
        } catch (error) {
            console.error(error);
            return Promise.reject(`Unable to update plugin from ${oldPluginKey} to ${newPluginKey}: ${error.message}`);
        }
    }

}
