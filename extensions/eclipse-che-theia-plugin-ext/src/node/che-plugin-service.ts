/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as https from 'https';
import * as tunnel from 'tunnel';
import * as url from 'url';

import {
  ChePluginMetadata,
  ChePluginRegistries,
  ChePluginRegistry,
  ChePluginService,
  ChePluginServiceClient,
} from '../common/che-plugin-protocol';
import { DevfileComponent, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { WorkspaceService, WorkspaceSettings } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { injectable, interfaces } from 'inversify';

import { CertificateService } from '@eclipse-che/theia-remote-api/lib/common/certificate-service';
import { PluginFilter } from '../common/plugin/plugin-filter';
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
export class ChePluginServiceImpl implements ChePluginService {
  private workspaceService: WorkspaceService;
  private devfileService: DevfileService;
  private certificateService: CertificateService;

  private defaultRegistry: ChePluginRegistry;

  private client: ChePluginServiceClient | undefined;

  private cachedPlugins: ChePluginMetadata[] = [];

  constructor(container: interfaces.Container) {
    this.workspaceService = container.get(WorkspaceService);
    this.devfileService = container.get(DevfileService);
    this.certificateService = container.get(CertificateService);
  }

  setClient(client: ChePluginServiceClient): void {
    this.client = client;
  }

  disconnectClient(client: ChePluginServiceClient): void {
    this.client = undefined;
  }

  dispose(): void {}

  ensurePluginsURI(uri: string): string {
    if (!uri.endsWith('/plugins/')) {
      if (uri.endsWith('/')) {
        uri = uri.substring(0, uri.length - 1);
      }

      if (!uri.endsWith('/plugins')) {
        uri += '/plugins/';
      }
    }

    return uri;
  }

  async getDefaultRegistry(): Promise<ChePluginRegistry> {
    if (this.defaultRegistry) {
      return this.defaultRegistry;
    }

    try {
      const workspaceSettings: WorkspaceSettings = await this.workspaceService.getWorkspaceSettings();
      if (workspaceSettings && workspaceSettings[PLUGIN_REGISTRY_INTERNAL_URL]) {
        const uri = workspaceSettings[PLUGIN_REGISTRY_INTERNAL_URL];

        let publicUri: string | undefined;
        if (workspaceSettings[PLUGIN_REGISTRY_URL]) {
          publicUri = workspaceSettings[PLUGIN_REGISTRY_URL];
        }

        this.defaultRegistry = {
          name: 'Eclipse Che plugins',
          uri: this.ensurePluginsURI(uri),
          publicUri: publicUri ? this.ensurePluginsURI(publicUri) : undefined,
        };

        return this.defaultRegistry;
      }

      return Promise.reject('Plugin registry URI is not set.');
    } catch (error) {
      console.error(error);
      return Promise.reject(`Unable to get default plugin registry URI. ${error.message}`);
    }
  }

  /**
   * If the URI points to default plugin registry, axios will use local authority certificates.
   */
  private async getAxiosInstance(uri: string): Promise<AxiosInstance> {
    const certificateAuthority = await this.certificateService.getCertificateAuthority();

    const proxyUrl = process.env.http_proxy;
    const baseUrl = process.env.CHE_API;
    if (proxyUrl && proxyUrl !== '' && baseUrl) {
      const parsedBaseUrl = url.parse(baseUrl);
      if (parsedBaseUrl.hostname && this.shouldProxy(parsedBaseUrl.hostname)) {
        const axiosRequestConfig: AxiosRequestConfig | undefined = {
          proxy: false,
        };
        const parsedProxyUrl = url.parse(proxyUrl);
        const mainProxyOptions = this.getMainProxyOptions(parsedProxyUrl);
        const httpsProxyOptions = this.getHttpsProxyOptions(
          mainProxyOptions,
          parsedBaseUrl.hostname,
          certificateAuthority
        );
        const httpOverHttpAgent = tunnel.httpOverHttp({ proxy: mainProxyOptions });
        const httpOverHttpsAgent = tunnel.httpOverHttps({ proxy: httpsProxyOptions });
        const httpsOverHttpAgent = tunnel.httpsOverHttp({
          proxy: mainProxyOptions,
          ca: certificateAuthority ? certificateAuthority : undefined,
        });
        const httpsOverHttpsAgent = tunnel.httpsOverHttps({
          proxy: httpsProxyOptions,
          ca: certificateAuthority ? certificateAuthority : undefined,
        });
        const urlIsHttps = (parsedBaseUrl.protocol || 'http:').startsWith('https:');
        const proxyIsHttps = (parsedProxyUrl.protocol || 'http:').startsWith('https:');
        if (urlIsHttps) {
          axiosRequestConfig.httpsAgent = proxyIsHttps ? httpsOverHttpsAgent : httpsOverHttpAgent;
        } else {
          axiosRequestConfig.httpAgent = proxyIsHttps ? httpOverHttpsAgent : httpOverHttpAgent;
        }
        return axios.create(axiosRequestConfig);
      }
    }

    if (uri.startsWith(this.defaultRegistry.uri) && certificateAuthority) {
      return axios.create({
        httpsAgent: new https.Agent({
          ca: certificateAuthority,
        }),
      });
    }

    return axios;
  }

  private getHttpsProxyOptions(
    mainProxyOptions: tunnel.ProxyOptions,
    servername: string | undefined,
    certificateAuthority: Buffer[] | undefined
  ): tunnel.HttpsProxyOptions {
    return {
      host: mainProxyOptions.host,
      port: mainProxyOptions.port,
      proxyAuth: mainProxyOptions.proxyAuth,
      servername,
      ca: certificateAuthority ? certificateAuthority : undefined,
    };
  }

  private getMainProxyOptions(parsedProxyUrl: url.UrlWithStringQuery): tunnel.ProxyOptions {
    const port = Number(parsedProxyUrl.port);
    return {
      host: parsedProxyUrl.hostname!,
      port: parsedProxyUrl.port !== '' && !isNaN(port) ? port : 3128,
      proxyAuth: parsedProxyUrl.auth && parsedProxyUrl.auth !== '' ? parsedProxyUrl.auth : undefined,
    };
  }

  private shouldProxy(hostname: string): boolean {
    const noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
    const noProxy: string[] = noProxyEnv ? noProxyEnv.split(',').map(s => s.trim()) : [];
    return !noProxy.some(rule => {
      if (!rule) {
        return false;
      }
      if (rule === '*') {
        return true;
      }
      if (rule[0] === '.' && hostname.substr(hostname.length - rule.length) === rule) {
        return true;
      }
      return hostname === rule;
    });
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
        const longKeyFormat = registry.uri !== this.defaultRegistry.uri;

        for (let pIndex = 0; pIndex < registryPlugins.length; pIndex++) {
          const metadataInternal: ChePluginMetadataInternal = registryPlugins[pIndex];
          const pluginYamlURI = this.getPluginYampURI(registry, metadataInternal);

          try {
            const pluginMetadata = await this.loadPluginMetadata(
              pluginYamlURI,
              longKeyFormat,
              registry.publicUri || registry.uri
            );
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
    const axiosInstance = await this.getAxiosInstance(registry.uri);
    return (await axiosInstance.get<ChePluginMetadataInternal[]>(registry.uri)).data;
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
        if (registry.uri === this.defaultRegistry.uri) {
          // To work in both single host and multi host modes.
          // In single host mode plugin registry url path is `plugin-registry/v3/plugins`,
          // for multi host mode the path is `v3/plugins`. So, in both cases plugin registry url
          // ends with `v3/plugins`, but ${plugin.links.self} starts with `/v3/plugins/${plugin.id}.
          // See https://github.com/eclipse/che-plugin-registry/blob/master/build/scripts/index.sh#L27
          // So the correct plugin url for both cases will be plugin registry url + plugin id.
          if (registry.uri.endsWith('/')) {
            return `${registry.uri}${plugin.id}/`;
          } else {
            return `${registry.uri}/${plugin.id}/`;
          }
        }
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
      const axiosInstance = await this.getAxiosInstance(yamlURI);
      const data = (await axiosInstance.get<ChePluginMetadata[]>(yamlURI)).data;
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
      const axiosInstance = await this.getAxiosInstance(yamlURI);
      const data = (await axiosInstance.get<ChePluginMetadata[]>(yamlURI)).data;
      return yaml.safeLoad(data);
    } catch (error) {
      console.error(error);
      return Promise.reject('Unable to load plugin metadata. ' + err.message);
    }
  }

  private async loadPluginMetadata(
    yamlURI: string,
    longKeyFormat: boolean,
    pluginRegistryURI?: string
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

      let icon = props.icon;
      if (pluginRegistryURI && props.icon && props.icon.startsWith('/')) {
        const uri = new URI(pluginRegistryURI);
        icon = `${uri.scheme}://${uri.authority}${icon}`;
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
   * Returns list of plugins described in workspace configuration.
   */
  async getWorkspacePlugins(): Promise<string[]> {
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
