/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import {
    CheApiService,
    ChePluginService,
    ChePluginRegistry,
    ChePluginMetadata,
    WorkspaceSettings
} from '../common/che-protocol';
import { injectable, interfaces } from 'inversify';
import axios, { AxiosInstance } from 'axios';
import { che as cheApi } from '@eclipse-che/api';
import URI from '@theia/core/lib/common/uri';
import { PluginFilter } from '../common/plugin/plugin-filter';

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
        self?: string,
        [link: string]: string
    }
}

@injectable()
export class ChePluginServiceImpl implements ChePluginService {

    private axiosInstance: AxiosInstance = axios;

    private cheApiService: CheApiService;

    private defaultRegistry: ChePluginRegistry;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    async getDefaultRegistry(): Promise<ChePluginRegistry> {
        if (this.defaultRegistry) {
            return this.defaultRegistry;
        }

        try {
            const workspaceSettings: WorkspaceSettings = await this.cheApiService.getWorkspaceSettings();
            if (workspaceSettings && workspaceSettings['cheWorkspacePluginRegistryUrl']) {
                let uri = workspaceSettings['cheWorkspacePluginRegistryUrl'];

                if (uri.endsWith('/')) {
                    uri = uri.substring(0, uri.length - 1);
                }

                if (!uri.endsWith('/plugins')) {
                    uri += '/plugins/';
                }

                this.defaultRegistry = {
                    name: 'Eclipse Che plugins',
                    uri: uri
                };

                return this.defaultRegistry;
            }

            return Promise.reject('Plugin registry URI is not set.');
        } catch (error) {
            // console.log('ERROR', error);
            // return Promise.reject('Unable to get default plugin registry URI. ' + error.message);

            // A temporary solution. Should throw an error instead.
            this.defaultRegistry = {
                name: 'Eclipse Che plugin registry',
                uri: 'https://che-plugin-registry.openshift.io/v3/plugins/'
            };
            return this.defaultRegistry;
        }
    }

    /**
     * Removes plugins with type 'Che Editor' if type '@type:che_editor' is not set
     */
    squeezeOutEditors(plugins: ChePluginMetadata[], filter: string): ChePluginMetadata[] {
        // do not filter if user requested list of editors
        if (PluginFilter.hasType(filter, '@type:che_editor')) {
            return plugins;
        }

        return plugins.filter(plugin => 'Che Editor' !== plugin.type);
    }

    /**
     * Returns a list of available plugins on the plugin registry.
     *
     * @param registry ChePluginRegistry plugin registry
     * @param filter filter
     * @return list of available plugins
     */
    async getPlugins(registry: ChePluginRegistry, filter: string): Promise<ChePluginMetadata[]> {
        // ensure default plugin registry URI is set
        if (!this.defaultRegistry) {
            await this.getDefaultRegistry();
        }

        let pluginList;
        if (filter) {
            if (PluginFilter.hasType(filter, '@installed')) {
                pluginList = await this.getInstalledPlugins();
            } else {
                pluginList = await this.getAllPlugins(registry);
            }

            pluginList = PluginFilter.filterPlugins(pluginList, filter);
        } else {
            pluginList = await this.getAllPlugins(registry);
        }

        // remove che_editor if type @type:che_editor is not set
        pluginList = this.squeezeOutEditors(pluginList, filter);

        return pluginList;
    }

    /**
     * Returns non-filtered list of the plugins from the given plugin registry.
     */
    async getAllPlugins(registry: ChePluginRegistry): Promise<ChePluginMetadata[]> {
        // Get list of ChePluginMetadataInternal from plugin registry
        const marketplacePlugins = await this.loadPluginList(registry);
        if (!marketplacePlugins) {
            return Promise.reject('Unable to get plugins from marketplace');
        }

        const longKeyFormat = registry.uri !== this.defaultRegistry.uri;
        const plugins: ChePluginMetadata[] = await Promise.all(
            marketplacePlugins.map(async marketplacePlugin => {
                const pluginYamlURI = this.getPluginYampURI(registry, marketplacePlugin);
                return await this.loadPluginMetadata(pluginYamlURI, longKeyFormat);
            }
            ));

        return plugins.filter(plugin => plugin !== null && plugin !== undefined);
    }

    // has prefix @installed
    async getInstalledPlugins(): Promise<ChePluginMetadata[]> {
        const workspacePlugins = await this.getWorkspacePlugins();
        const plugins: ChePluginMetadata[] = await Promise.all(
            workspacePlugins.map(async workspacePlugin => {
                let pluginYamlURI;
                let longKeyFormat = false;

                if (workspacePlugin.startsWith('http://') || workspacePlugin.startsWith('https://')) {
                    pluginYamlURI = `${workspacePlugin}/meta.yaml`;
                    longKeyFormat = true;
                } else {
                    let uri = this.defaultRegistry.uri;
                    if (uri.endsWith('/')) {
                        uri = uri.substring(0, uri.length - 1);
                    }

                    pluginYamlURI = `${uri}/${workspacePlugin}/meta.yaml`;
                }

                return await this.loadPluginMetadata(pluginYamlURI, longKeyFormat);
            }
            ));

        return plugins.filter(plugin => plugin !== null && plugin !== undefined);
    }

    /**
     * Loads list of plugins from plugin registry.
     *
     * @param registry ChePluginRegistry plugin registry
     * @return list of available plugins
     */
    private async loadPluginList(registry: ChePluginRegistry): Promise<ChePluginMetadataInternal[] | undefined> {
        try {
            const noCache = { headers: { 'Cache-Control': 'no-cache' } };
            return (await this.axiosInstance.get<ChePluginMetadataInternal[]>(registry.uri, noCache)).data;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Creates an URI to plugin metadata yaml file.
     *
     * @param registry: ChePluginRegistry plugin registry
     * @param plugin plugin metadata
     * @return uri to plugin yaml file
     */
    private getPluginYampURI(registry: ChePluginRegistry, plugin: ChePluginMetadataInternal): string | undefined {
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
        const noCache = { headers: { 'Cache-Control': 'no-cache' } };

        let err;
        try {
            const data = (await this.axiosInstance.get<ChePluginMetadata[]>(yamlURI, noCache)).data;
            return yaml.safeLoad(data);
        } catch (error) {
            err = error;
        }

        try {
            if (!yamlURI.endsWith('/')) {
                yamlURI += '/';
            }
            yamlURI += 'meta.yaml';
            const data = (await this.axiosInstance.get<ChePluginMetadata[]>(yamlURI, noCache)).data;
            return yaml.safeLoad(data);
        } catch (error) {
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
            console.log(error);
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
                const foundIndex = plugins.indexOf(id);
                if (foundIndex >= 0) {
                    plugins.splice(foundIndex, 1);
                } else {
                    workspace.devfile.components.splice(workspace.devfile.components.indexOf(component), 1);
                }
            });

            plugins.forEach((plugin: string) => {
                workspace.devfile.components.push(this.createPluginComponent(plugin));
            });
        }

        await this.cheApiService.updateWorkspace(workspace.id, workspace);
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

}
