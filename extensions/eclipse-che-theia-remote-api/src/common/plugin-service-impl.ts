/**********************************************************************
 * Copyright (c) 2019-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  Changes,
  ChePluginMetadata,
  ChePluginRegistries,
  ChePluginRegistry,
  ChePluginService,
  ChePluginServiceClient,
} from './plugin-service';
import { inject, injectable } from 'inversify';

import { HttpService } from './http-service';
import URI from '@theia/core/lib/common/uri';

const yaml = require('js-yaml');

/**
 * Describes plugin inside plugin list
 * https://che-plugin-registry.openshift.io/plugins/
 */
export interface ChePluginMetadataInternal {
  id: string;
  displayName: string;
  version: string;
  type: string;
  name: string;
  description: string;
  publisher: string;
  links: {
    self: string;
    [link: string]: string;
  };
}

@injectable()
export abstract class PluginServiceImpl implements ChePluginService {
  @inject(HttpService)
  protected httpService: HttpService;

  client: ChePluginServiceClient | undefined;

  protected defaultRegistry: ChePluginRegistry;

  private cachedPlugins: ChePluginMetadata[] = [];

  setClient(client: ChePluginServiceClient): void {
    this.client = client;
  }

  disconnectClient(client: ChePluginServiceClient): void {
    this.client = undefined;
  }

  dispose(): void {}

  trimTrailingSlash(uri: string): string {
    if (uri.endsWith('/')) {
      return uri.substring(0, uri.length - 1);
    }

    return uri;
  }

  async sleep(miliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, miliseconds);
    });
  }

  abstract getDefaultRegistry(): Promise<ChePluginRegistry>;

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

  /**
   * Loads list of plugins from plugin registry.
   *
   * @param registry ChePluginRegistry plugin registry
   * @return list of available plugins
   */
  private async loadPluginList(registry: ChePluginRegistry): Promise<ChePluginMetadataInternal[]> {
    const registryURI = registry.internalURI + '/plugins/';
    const registryContent = (await this.httpService.get(registryURI)) || '{}';
    return JSON.parse(registryContent) as ChePluginMetadataInternal[];
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

  private getBaseDirectory(registry: ChePluginRegistry): string {
    let uri = registry.internalURI;

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

  private async loadPluginMetadata(
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
   * Returns a list of available plugins on the plugin registry.
   *
   * @return list of available plugins
   */
  async getPlugins(): Promise<ChePluginMetadata[]> {
    // remove editors ( to be compatible with all versions of plugin registry )
    return this.cachedPlugins.filter(plugin => 'Che Editor' !== plugin.type);
  }

  abstract getInstalledPlugins(): Promise<string[]>;

  abstract installPlugin(pluginKey: string): Promise<boolean>;

  abstract removePlugin(pluginKey: string): Promise<void>;

  abstract updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void>;

  async deferredInstallation(): Promise<boolean> {
    return false;
  }

  async getUnpersistedChanges(): Promise<Changes | undefined> {
    return undefined;
  }

  async persist(): Promise<void> {}
}
