/**********************************************************************
 * Copyright (c) 2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  ChePluginMetadata,
  ChePluginRegistries,
  ChePluginRegistry,
} from '@eclipse-che/theia-remote-api/lib/common/plugin-service';
import {
  ChePluginMetadataInternal,
  PluginServiceImpl,
} from '@eclipse-che/theia-remote-api/lib/common/plugin-service-impl';
import { DevfileComponent, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { WorkspaceService, WorkspaceSettings } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import URI from '@theia/core/lib/common/uri';

const yaml = require('js-yaml');

/**
 * Workspace Settings :: Plugin Registry URI.
 * Public URI to load registry resources, e.g. icons.
 */
const PLUGIN_REGISTRY_URL = 'cheWorkspacePluginRegistryUrl';

/**
 * Workspace Settings :: Plugin Registry internal URI.
 * Is used for cross-container communication and mostly for getting plugins metadata.
 */
const PLUGIN_REGISTRY_INTERNAL_URL = 'cheWorkspacePluginRegistryInternalUrl';

@injectable()
export class CheServerPluginServiceImpl extends PluginServiceImpl {
  @inject(WorkspaceService)
  private workspaceService: WorkspaceService;

  @inject(DevfileService)
  private devfileService: DevfileService;

  async getDefaultRegistry(): Promise<ChePluginRegistry> {
    if (this.defaultRegistry) {
      return this.defaultRegistry;
    }

    try {
      const workspaceSettings: WorkspaceSettings = await this.workspaceService.getWorkspaceSettings();
      if (workspaceSettings) {
        const publicUri = workspaceSettings[PLUGIN_REGISTRY_URL];
        const internalUri = workspaceSettings[PLUGIN_REGISTRY_INTERNAL_URL] || publicUri;

        if (publicUri) {
          this.defaultRegistry = {
            name: 'Eclipse Che plugins',
            internalURI: this.trimTrailingSlash(internalUri),
            publicURI: this.trimTrailingSlash(publicUri),
          };

          return this.defaultRegistry;
        }
      }

      return Promise.reject('Plugin registry is not configured');
    } catch (error) {
      console.error(error);
      return Promise.reject(`Unable to get default plugin registry URI. ${error.message}`);
    }
  }

  /**
   * Updates the plugin cache
   *
   * @param registryList list of plugin registries
   */
  async updateCache(registries: ChePluginRegistries): Promise<void> {
    if (!this.client) {
      throw new Error('PluginServiceImpl is not properly initialized :: ChePluginServiceClient is not set.');
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
        if (!Array.isArray(registryPlugins)) {
          await this.client.invalidRegistryFound(registry);
          continue;
        }
        availablePlugins += registryPlugins.length;
        await this.client.notifyPluginCacheSizeChanged(availablePlugins);

        // Plugin key used to specify a plugin in the devfile.
        // It can be short:
        //      {publisher}/{pluginName}/{version}
        // or long, including the path to plugin meta.yaml
        //      {http/https}://{host}/{path}/{publisher}/{pluginName}/{version}
        const longKeyFormat = registry.internalURI !== this.defaultRegistry.internalURI;

        for (let pIndex = 0; pIndex < registryPlugins.length; pIndex++) {
          const metadataInternal: ChePluginMetadataInternal = registryPlugins[pIndex];
          const pluginYamlURI = this.getPluginYamlURI(registry, metadataInternal);

          try {
            const pluginMetadata = await this.loadPluginMetadata(pluginYamlURI, longKeyFormat, registry.publicURI);
            this.cachedPlugins.push(pluginMetadata);
            await this.client.notifyPluginCached(this.cachedPlugins.length);
          } catch (error) {
            console.log('Unable go get plugin metadata from ' + pluginYamlURI);
            await this.client.invalidPluginFound(pluginYamlURI);
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

  async loadPluginYaml(yamlURI: string): Promise<ChePluginMetadata> {
    let err;
    try {
      const pluginYamlContent = await this.httpService.get(yamlURI);
      return yaml.safeLoad(pluginYamlContent);
    } catch (error) {
      console.error(error);
      err = error;
    }

    try {
      if (!yamlURI.endsWith('/')) {
        yamlURI += '/';
      }
      yamlURI += 'meta.yaml';
      const pluginYamlContent = await this.httpService.get(yamlURI);
      return yaml.safeLoad(pluginYamlContent);
    } catch (error) {
      console.error(error);
      return Promise.reject('Unable to load plugin metadata. ' + err.message);
    }
  }

  async loadPluginMetadata(
    yamlURI: string,
    longKeyFormat: boolean,
    pluginRegistryURI: string
  ): Promise<ChePluginMetadata> {
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

      let icon;
      if (props.icon.startsWith('http://') || props.icon.startsWith('https://')) {
        // icon refers on external resource
        icon = props.icon;
      } else {
        // icon must be relative to plugin registry ROOT
        icon = props.icon.startsWith('/') ? pluginRegistryURI + props.icon : pluginRegistryURI + '/' + props.icon;
      }

      return {
        publisher: props.publisher,
        name: props.name,
        version: props.version,
        type: props.type,
        displayName: props.displayName,
        title: props.title,
        description: props.description,
        icon: icon,
        url: props.url,
        repository: props.repository,
        firstPublicationDate: props.firstPublicationDate,
        category: props.category,
        latestUpdateDate: props.latestUpdateDate,
        key: key,
        builtIn: false,
      };
    } catch (error) {
      console.log(`Cannot get ${yamlURI}`, error);
      return Promise.reject('Unable to load plugin metadata. ' + error.message);
    }
  }

  /**
   * Creates an URI to plugin metadata yaml file.
   *
   * @param registry: ChePluginRegistry plugin registry
   * @param plugin plugin metadata
   * @return uri to plugin yaml file
   */
  private getPluginYamlURI(registry: ChePluginRegistry, plugin: ChePluginMetadataInternal): string {
    if (plugin.links && plugin.links.self) {
      const self: string = plugin.links.self;
      if (self.startsWith('/')) {
        if (registry.internalURI === this.defaultRegistry.internalURI) {
          // To work in both single host and multi host modes.
          // In single host mode plugin registry url path is `plugin-registry/v3/plugins`,
          // for multi host mode the path is `v3/plugins`. So, in both cases plugin registry url
          // ends with `v3/plugins`, but ${plugin.links.self} starts with `/v3/plugins/${plugin.id}.
          // See https://github.com/eclipse/che-plugin-registry/blob/master/build/scripts/index.sh#L27
          // So the correct plugin url for both cases will be plugin registry url + plugin id.
          return `${registry.internalURI}/plugins/${plugin.id}/`;
        }
        const uri = new URI(registry.internalURI);
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
  createPluginComponent(id: string): DevfileComponent {
    if (id.startsWith('http://') || id.startsWith('https://')) {
      return {
        plugin: {
          url: `${id}/meta.yaml`,
        },
      };
    } else {
      return {
        plugin: {
          id: `${id}`,
        },
      };
    }
  }

  /**
   * Returns list of installed plugins.
   */
  async getInstalledPlugins(): Promise<string[]> {
    const devfile = await this.devfileService.get();
    const devfileComponents: DevfileComponent[] = devfile.components || [];
    devfile.components = devfileComponents;

    const plugins: string[] = [];
    devfileComponents.forEach(component => {
      if (component.plugin) {
        if (component.plugin.url) {
          plugins.push(this.normalizeId(component.plugin.url));
        } else if (component.plugin.id) {
          plugins.push(component.plugin.id);
        }
      }
    });
    return plugins;
  }

  /**
   * Sets new list of plugins to workspace configuration.
   */
  async setWorkspacePlugins(plugins: string[]): Promise<void> {
    const devfile = await this.devfileService.get();
    const devfileComponents: DevfileComponent[] = devfile.components || [];

    const components = devfileComponents.filter(component => component.plugin !== undefined);

    components.forEach(component => {
      const id = component.plugin!.url ? this.normalizeId(component.plugin!.url) : component.plugin?.id!;
      const foundIndex = plugins.indexOf(id);
      if (foundIndex >= 0) {
        plugins.splice(foundIndex, 1);
      } else {
        devfileComponents.splice(devfileComponents.indexOf(component), 1);
      }
    });

    plugins.forEach((plugin: string) => {
      devfileComponents.push(this.createPluginComponent(plugin));
    });
    devfile.components = devfileComponents;

    await this.devfileService.updateDevfile(devfile);
  }

  /**
   * Adds a plugin to current Che workspace.
   */
  async installPlugin(pluginKey: string): Promise<boolean> {
    try {
      const plugins: string[] = await this.getInstalledPlugins();
      plugins.push(pluginKey);
      await this.setWorkspacePlugins(plugins);
      return true;
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
      const plugins: string[] = await this.getInstalledPlugins();
      const filteredPlugins = plugins.filter(p => p !== pluginKey);
      await this.setWorkspacePlugins(filteredPlugins);
    } catch (error) {
      console.error(error);
      return Promise.reject('Unable to remove plugin ' + pluginKey + ' ' + error.message);
    }
  }

  async updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void> {
    try {
      const plugins: string[] = await this.getInstalledPlugins();
      const filteredPlugins = plugins.filter(p => p !== oldPluginKey);
      filteredPlugins.push(newPluginKey);
      await this.setWorkspacePlugins(filteredPlugins);
    } catch (error) {
      console.error(error);
      return Promise.reject(`Unable to update plugin from ${oldPluginKey} to ${newPluginKey}: ${error.message}`);
    }
  }
}
