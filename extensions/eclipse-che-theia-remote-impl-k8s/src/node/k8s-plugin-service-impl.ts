/**********************************************************************
 * Copyright (c) 2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as jsoncparser from 'jsonc-parser';
import * as path from 'path';

import {
  Changes,
  ChePluginMetadata,
  ChePluginRegistries,
  ChePluginRegistry,
} from '@eclipse-che/theia-remote-api/lib/common/plugin-service';
import {
  ChePluginMetadataInternal,
  PluginServiceImpl,
} from '@eclipse-che/theia-remote-api/lib/common/plugin-service-impl';
import { Devfile, DevfileComponent } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { inject, injectable, postConstruct } from 'inversify';

import { K8sDevWorkspaceEnvVariables } from './k8s-devworkspace-env-variables';
import { K8sDevfileServiceImpl } from './k8s-devfile-service-impl';
import { K8sWorkspaceServiceImpl } from './k8s-workspace-service-impl';
import URI from '@theia/core/lib/common/uri';

export const CHE_PLUGINS_JSON = '/plugins/che-plugins.json';

export const PLUGINS_DIR = '/plugins';
export const SIDECAR_PLUGINS_DIR = '/plugins/sidecars';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// che-theia-plugin.yaml definition
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

export namespace CheTheiaPlugin {
  export interface Plugin {
    schemaVersion: string;
    metadata: Metadata;
    sidecar?: Sidecar;
    preferences?: Preferences;
    dependencies?: string[];
    extensions?: string[];
  }

  export interface Metadata {
    id: string;
    publisher: string;
    name: string;
    version: string;
    displayName: string;
    description: string;
    repository: string;
    categories: string[];
    icon: string;
  }

  export interface Sidecar {
    name?: string;
    memoryLimit?: string;
    memoryRequest?: string;
    cpuLimit?: string;
    cpuRequest?: string;
    volumeMounts?: VolumeMount[];
    image: string;
  }

  export interface VolumeMount {
    name: string;
    path: string;
  }

  export interface Preferences {
    [name: string]: string;
  }
}

export interface Installation {
  plugins: string[];

  cache: {
    [plugin: string]: CheTheiaPlugin.Plugin;
  };
}

/**
 * Describes properties in che-theia-plugin.yaml
 */
export interface CheTheiaPluginYaml {
  metadata: {
    id: string;
    publisher: string;
    name: string;
    version: string;
    displayName: string;
    description: string;
    repository: string;
    categories: string[];
    icon: string;
  };

  dependencies?: string[];
  extensions?: string[];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// plugin.json definition
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

interface PluginList {
  /**
   * array of plugin identifiers
   * identifier should be in format ${publisher}.${name}
   */
  plugins: string[];
}

export class Deferred<T> {
  state: 'pending' | 'resolved' | 'rejected' = 'pending';
  resolve: (value?: T) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (err?: any) => void;

  promise = new Promise<T>((resolve, reject) => {
    this.resolve = result => {
      resolve(result as T);
      if (this.state === 'pending') {
        this.state = 'resolved';
      }
    };
    this.reject = err => {
      reject(err);
      if (this.state === 'pending') {
        this.state = 'rejected';
      }
    };
  });
}

@injectable()
export class K8sPluginServiceImpl extends PluginServiceImpl {
  @inject(K8sDevWorkspaceEnvVariables)
  env: K8sDevWorkspaceEnvVariables;

  @inject(K8sDevfileServiceImpl)
  devfileService: K8sDevfileServiceImpl;

  @inject(K8sWorkspaceServiceImpl)
  workspaceService: K8sWorkspaceServiceImpl;

  deferred = new Deferred<void>();

  @postConstruct()
  protected startup(): void {
    this.initialize()
      .then(() => this.deferred.resolve())
      .catch(e => this.deferred.reject(e));
  }

  async initialize(): Promise<void> {
    const ERRMSG = 'Failure to initialize K8sPluginServiceImpl';

    const projectsRoot = this.env.getProjectsRoot();

    if (!projectsRoot) {
      throw new Error(ERRMSG + 'Projects Root is not set.');
    }

    if (!(await fs.pathExists(projectsRoot))) {
      throw new Error(ERRMSG + `Projects root [${projectsRoot}] does not exist`);
    }

    if (await fs.pathExists(CHE_PLUGINS_JSON)) {
      try {
        const list = await this.readChePluginsJSON();
        for (const plugin of list.plugins) {
          const parts: string[] = plugin.split('.');
          this.installedPlugins.push(`${parts[0]}/${parts[1]}/latest`);
        }
      } catch (error) {
        throw new Error('Unable to get list of installed plugins. ' + error.message);
      }

      return;
    }

    try {
      const pluginList: PluginList = { plugins: [] };

      const devfile: Devfile = await this.devfileService.get();

      if (devfile.attributes && devfile.attributes['.vscode/extensions.json']) {
        await this.fetchPluginsFromExtensionsJSON(devfile.attributes['.vscode/extensions.json'], pluginList);
      }

      if (devfile.attributes && devfile.attributes['.che/che-theia-plugins.yaml']) {
        await this.fetchPluginsFromCheTheiaPluginsYaml(devfile.attributes['.che/che-theia-plugins.yaml'], pluginList);
      }

      const projects = await fs.readdir(projectsRoot);
      for (const project of projects) {
        const extensionsJson = path.join(projectsRoot, project, '.vscode', 'extensions.json');

        if ((await fs.pathExists(extensionsJson)) && (await fs.stat(extensionsJson)).isFile()) {
          try {
            const content = await fs.readFile(extensionsJson, 'utf-8');
            await this.fetchPluginsFromExtensionsJSON(content, pluginList);
          } catch (thisError) {
            console.error(
              `Unable to get list of extensions for ${project}. ${thisError.message ? thisError.message : thisError}`
            );
          }
        }
      }

      await this.writeChePluginsJSON(pluginList);
    } catch (error) {
      throw new Error(ERRMSG + (error ? ' :: ' + (error.message ? error.message : error) : ''));
    }
  }

  async fetchPluginsFromExtensionsJSON(content: string, pluginList: PluginList): Promise<void> {
    const strippedContent = jsoncparser.stripComments(content);
    const extensions = jsoncparser.parse(strippedContent);

    const recommendations = extensions['recommendations'];

    const heap: Installation = {
      plugins: [],
      cache: {},
    };

    for (const recommendation of recommendations) {
      const parts: string[] = recommendation.split('.');

      try {
        await this.prepareToInstall(`${parts[0]}/${parts[1]}/latest`, heap, false);
      } catch (error) {
        console.error(`Unable to get plugin metadata for ${recommendation}`);
        continue;
      }

      for (const plugin of heap.plugins) {
        const pluginParts: string[] = plugin.split('/');

        if (!pluginList.plugins.find(value => value === `${pluginParts[0]}.${pluginParts[1]}`)) {
          pluginList.plugins.push(`${pluginParts[0]}.${pluginParts[1]}`);
        }

        if (!this.installedPlugins.find(value => value === plugin)) {
          this.installedPlugins.push(plugin);
        }
      }
    }
  }

  async fetchPluginsFromCheTheiaPluginsYaml(content: string, pluginList: PluginList): Promise<void> {
    const yaml = jsYaml.load(content);

    const heap: Installation = {
      plugins: [],
      cache: {},
    };

    for (const requiredPlugin of yaml) {
      const pluginID = requiredPlugin['id'];

      try {
        await this.prepareToInstall(pluginID, heap, false);
      } catch (error) {
        console.error(`Unable to get plugin metadata for ${pluginID}`);
        continue;
      }

      for (const plugin of heap.plugins) {
        const pluginParts: string[] = plugin.split('/');

        if (!pluginList.plugins.find(value => value === `${pluginParts[0]}.${pluginParts[1]}`)) {
          pluginList.plugins.push(`${pluginParts[0]}.${pluginParts[1]}`);
        }

        if (!this.installedPlugins.find(value => value === plugin)) {
          this.installedPlugins.push(plugin);
        }
      }
    }
  }

  /**
   * Reads plugin list from /plugins/che-plugins.json
   *
   * @returns plugin list
   */
  async readChePluginsJSON(): Promise<PluginList> {
    const content = await fs.readFile(CHE_PLUGINS_JSON, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Writes plugin list to /plugins/che-plugins.json
   *
   * @param plugins plugin list
   */
  async writeChePluginsJSON(plugins: PluginList): Promise<void> {
    const data = `${JSON.stringify(plugins, undefined, 2)}\n`;
    await fs.writeFile(CHE_PLUGINS_JSON, data);
  }

  /**
   * Returns default plugin registry.
   *
   * @returns default plugin registry
   */
  async getDefaultRegistry(): Promise<ChePluginRegistry> {
    if (this.defaultRegistry) {
      return this.defaultRegistry;
    }

    await this.deferred.promise;

    const registryURL = this.env.getPluginRegistryURL();
    const registryInternalURL = this.env.getPluginRegistryInternalURL();

    if (!registryURL) {
      throw new Error('Plugin registry URL is not configured.');
    }

    if (!registryInternalURL) {
      throw new Error('Plugin registry internal URL is not configured.');
    }

    this.defaultRegistry = {
      name: 'Eclipse Che plugins',
      internalURI: this.trimTrailingSlash(registryInternalURL),
      publicURI: this.trimTrailingSlash(registryURL),
    };

    return this.defaultRegistry;
  }

  private getCheTheiaPluginYamlURI(registry: ChePluginRegistry, plugin: ChePluginMetadataInternal): string {
    if (plugin.links && plugin.links.plugin) {
      const pluginURI: string = plugin.links.plugin;

      if (pluginURI.startsWith('/')) {
        const uri = new URI(registry.internalURI);
        return `${uri.scheme}://${uri.authority}${pluginURI}`;
      } else {
        const base = this.getBaseDirectory(registry);
        return `${base}${pluginURI}`;
      }
    } else {
      const base = this.getBaseDirectory(registry);
      return `${base}/${plugin.id}/che-theia-plugin.yaml`;
    }
  }

  /**
   * Updates the plugin cache
   *
   * @param registries list of plugin registries
   */
  async updateCache(registries: ChePluginRegistries): Promise<void> {
    if (!this.client) {
      throw new Error('PluginServiceImpl is not properly inisialized. ChePluginServiceClient is not set.');
    }

    await this.deferred.promise;

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
        const registryPlugins = await this.loadPluginList(registry);
        if (!Array.isArray(registryPlugins)) {
          await this.client.invalidRegistryFound(registry);
          continue;
        }

        availablePlugins += registryPlugins.length;
        await this.client.notifyPluginCacheSizeChanged(availablePlugins);

        for (let pIndex = 0; pIndex < registryPlugins.length; pIndex++) {
          const metadataInternal: ChePluginMetadataInternal = registryPlugins[pIndex];
          const cheTheiaPluginYamlURI = this.getCheTheiaPluginYamlURI(registry, metadataInternal);
          try {
            const pluginMetadata = await this.loadCheTheiaPluginYaml(cheTheiaPluginYamlURI, registry.publicURI);
            this.cachedPlugins.push(pluginMetadata);
            await this.client.notifyPluginCached(this.cachedPlugins.length);
          } catch (error) {
            await this.client.invalidPluginFound(cheTheiaPluginYamlURI);
          }
        }
      } catch (error) {
        await this.client.invalidRegistryFound(registry);
      }
    }

    // notify client that caching the plugins has been finished
    await this.client.notifyCachingComplete();
  }

  async loadCheTheiaPluginYaml(yamlURI: string, pluginRegistryURI: string): Promise<ChePluginMetadata> {
    let yamlContent: string | undefined;
    try {
      yamlContent = await this.httpService.get(yamlURI);
    } catch (error) {
      return Promise.reject(`Failure to load ${yamlURI}`);
    }

    if (!yamlContent) {
      throw new Error(`Failure to parse ${yamlURI}`);
    }

    try {
      const plugin: CheTheiaPluginYaml = jsYaml.safeLoad(yamlContent);

      let icon = plugin.metadata.icon;
      if (icon.startsWith('http://') || icon.startsWith('https://')) {
        // icon refers on external resource
        icon = icon;
      } else {
        // icon must be relative to plugin registry ROOT
        icon = icon.startsWith('/') ? pluginRegistryURI + icon : pluginRegistryURI + '/' + icon;
      }

      return {
        publisher: plugin.metadata.publisher,
        name: plugin.metadata.name,
        version: plugin.metadata.version,
        type: 'VS Code extension',
        displayName: plugin.metadata.displayName,
        title: plugin.metadata.displayName,
        description: plugin.metadata.description,
        icon,
        url: '',
        repository: plugin.metadata.repository,
        firstPublicationDate: '',
        category: plugin.metadata.categories ? plugin.metadata.categories.toString() : '',
        latestUpdateDate: '',
        key: `${plugin.metadata.id}/${plugin.metadata.version}`,
        builtIn: false,
        extensions: plugin.extensions ? [...plugin.extensions] : undefined,
        dependencies: plugin.dependencies ? [...plugin.dependencies] : undefined,
      };
    } catch (error) {
      throw new Error(`Failure to parse ${yamlURI}`);
    }
  }

  async getInstalledPlugins(): Promise<string[]> {
    await this.deferred.promise;
    return this.installedPlugins;
  }

  installedPlugins: string[] = [];
  toInstall: string[] = [];
  toRemove: string[] = [];

  async fetchCheTheiaPluginYaml(plugin: string): Promise<CheTheiaPlugin.Plugin> {
    const registryURL = this.trimTrailingSlash(this.env.getPluginRegistryInternalURL());
    const yamlURL = `${registryURL}/plugins/${plugin}/che-theia-plugin.yaml`;
    const pluginYaml = await this.httpService.get(yamlURL);

    if (!pluginYaml) {
      throw new Error(`Unable to get ${yamlURL}`);
    }

    const yaml = jsYaml.load(pluginYaml);

    if (!yaml.metadata) {
      throw new Error(`Failure to parse ${yamlURL}, wrong format.`);
    }

    return yaml;
  }

  async installPlugin(pluginId: string): Promise<boolean> {
    // check for existence in this.toRemove
    if (this.toRemove.find(value => value === pluginId)) {
      this.toRemove = this.toRemove.filter(value => value !== pluginId);
      return true;
    }

    const installation: Installation = {
      plugins: [],
      cache: {},
    };

    await this.prepareToInstall(pluginId, installation, true);

    // if there are more than one plugin, it means that the plugin requires some dependencies
    // and it is required to ask the user before installation
    if (installation.plugins.length > 1) {
      if (!this.client) {
        return false;
      }

      const dependencies = installation.plugins.slice(1, installation.plugins.length);
      const toConfirm: string[] = [];

      const allPlugins = await this.getPlugins();

      for (const dependency of dependencies) {
        if (allPlugins.find(value => `${value.publisher}/${value.name}/${value.version}` === dependency)) {
          toConfirm.push(dependency);
        }
      }

      if (toConfirm.length) {
        const confirmed = await this.client.askToInstallDependencies({
          plugins: toConfirm,
        });

        if (!confirmed) {
          return false;
        }
      }
    }

    for (const plugin of installation.plugins) {
      this.toInstall.push(plugin);
    }

    return true;
  }

  /**
   * Prepares the plugin to installing:
   *   - analizes che-theia-plugin.yaml
   *   - checks .vsix existence
   *   - recursively handles dependencies
   *
   * All the necessary informaion will be stored inside Installation object
   *
   * @param pluginId plugin to install, should be in format ${publisher}/${name}/${version}
   * @param installation storage for changes
   * @param vsixCheck if true, each .vsix resource will be checked on existence
   * @returns true, if plugin with its dependencies can be installed
   *          false, if plugin contains some dependecnices, but the user rejected the installation
   *
   * Will throw an error with user-friendly message in case of failures.
   */
  async prepareToInstall(pluginId: string, installation: Installation, vsixCheck: boolean): Promise<void> {
    // check for existence in this.installedPlugins
    if (this.installedPlugins.find(value => value === pluginId)) {
      // do nothing
      return;
    }

    // check for existence in this.toBeInstalled
    if (this.toInstall.find(value => value === pluginId)) {
      // do nothing
      return;
    }

    // check for existence in ${installation.plugins}
    if (installation.plugins.find(value => value === pluginId)) {
      // do nothing
      return;
    }

    const yaml = await this.fetchCheTheiaPluginYaml(pluginId);
    installation.plugins.push(pluginId);
    installation.cache[pluginId] = yaml;

    if (vsixCheck) {
      // check existence of all .vsix files
      if (yaml.extensions) {
        for (const extension of yaml.extensions) {
          if (!(await this.httpService.head(extension))) {
            throw new Error(`Extension ${extension} does not exist.`);
          }
        }
      }
    }

    // handle dependencies
    if (yaml.dependencies && yaml.dependencies.length) {
      for (const dependency of yaml.dependencies) {
        const parts = dependency.split('/');
        const dependencyId = `${parts[0]}/${parts[1]}/${parts.length === 3 ? parts[2] : 'latest'}`;
        await this.prepareToInstall(dependencyId, installation, vsixCheck);
      }
    }
  }

  async removePlugin(pluginToRemove: string): Promise<void> {
    // check for existence in this.toBeRemoved
    if (this.toRemove.find(value => value === pluginToRemove)) {
      return;
    }

    // do nothing if the plugin is not installed, and not marked for installation
    if (
      !this.installedPlugins.find(value => value === pluginToRemove) &&
      !this.toInstall.find(value => value === pluginToRemove)
    ) {
      return;
    }

    const allPlugins = await this.getPlugins();

    const dependentPlugins: string[] = [];

    const toCheck: string[] = [];
    toCheck.push(...this.installedPlugins);
    toCheck.push(...this.toInstall);

    for (const plugin of toCheck) {
      if (plugin === pluginToRemove) {
        continue;
      }

      const yaml = await this.fetchCheTheiaPluginYaml(plugin);
      if (yaml.dependencies) {
        for (const dependency of yaml.dependencies) {
          const parts = dependency.split('/');
          const version = parts.length === 3 ? parts[2] : 'latest';
          const dependencyId = `${parts[0]}/${parts[1]}/${version}`;

          if (dependencyId === pluginToRemove) {
            dependentPlugins.push(plugin);
          }
        }
      }
    }

    const autoRemove: string[] = [];

    const filteredDependentPlugins: string[] = dependentPlugins.filter(dep => {
      if (allPlugins.find(value => dep === `${value.publisher}/${value.name}/${value.version}`)) {
        return true;
      } else {
        autoRemove.push(dep);
        return false;
      }
    });

    if (filteredDependentPlugins.length === 0) {
      if (this.toInstall.find(value => value === pluginToRemove)) {
        this.toInstall = this.toInstall.filter(value => value !== pluginToRemove);
      } else {
        this.toRemove.push(pluginToRemove);
      }

      for (const plugin of autoRemove) {
        if (!this.toRemove.find(value => value === plugin)) {
          this.toRemove.push(plugin);
        }
      }
      return;
    }

    const plugins = filteredDependentPlugins.map((value, index) => `${index > 0 ? ' ' : ''}'${value}'`);

    const error = `Cannot remove '${pluginToRemove}'. ${
      plugins.length === 1 ? 'Plugin' : 'Plugins'
    } ${plugins.toString()} ${plugins.length === 1 ? 'depends' : 'depend'} on this.`;
    throw new Error(error);
  }

  async getUnpersistedChanges(): Promise<Changes | undefined> {
    return {
      toInstall: this.toInstall,
      toRemove: this.toRemove,
    };
  }

  async persist(): Promise<void> {
    if (this.toInstall.length === 0 && this.toRemove.length === 0) {
      return;
    }

    // get DevWorkspace template
    const devfile = await this.devfileService.get(true);
    const devContainer = this.findDevContainer(devfile);

    const installYamls: CheTheiaPlugin.Plugin[] = [];
    const removeYamls: CheTheiaPlugin.Plugin[] = [];

    // walk through toInstall list, download all che-theia-plugin.yaml files
    for (const plugin of this.toInstall) {
      const yaml = await this.fetchCheTheiaPluginYaml(plugin);
      installYamls.push(yaml);
    }

    // walk through toRemove list, download all che-theia-plugin.yaml files
    for (const plugin of this.toRemove) {
      const yaml = await this.fetchCheTheiaPluginYaml(plugin);
      removeYamls.push(yaml);
    }

    await this.downloadExtensions(installYamls, devContainer.name!);

    await this.cleanupExtensions(removeYamls, devContainer.name!);

    let devContainerChanged = false;

    // walk through toRemove list, remove extensions from the devfile
    for (const yaml of removeYamls) {
      if (!yaml.sidecar) {
        continue;
      }

      if (await this.removePluginFromDevContainer(yaml, devContainer)) {
        devContainerChanged = true;
      }
    }

    // walk through toInstall list, add extensions to the devfile
    for (const yaml of installYamls) {
      if (!yaml.sidecar) {
        continue;
      }

      if (await this.addPluginToDevContainer(yaml, devContainer)) {
        devContainerChanged = true;
      }
    }

    // update and persist list of installed plugins ( /plugins/plugins.json )
    for (const plugin of this.toRemove) {
      this.installedPlugins = this.installedPlugins.filter(value => value !== plugin);
    }

    for (const plugin of this.toInstall) {
      this.installedPlugins.push(plugin);
    }

    this.toRemove = [];
    this.toInstall = [];

    await this.persistInstalledPLuginsList();

    if (devContainerChanged) {
      await this.devfileService.patch('/spec/template/components', devfile.components!);
    }

    await this.workspaceService.stop();
  }

  async persistInstalledPLuginsList(): Promise<void> {
    const pluginList: PluginList = { plugins: [] };
    for (const plugin of this.installedPlugins) {
      const parts = plugin.split('/');
      pluginList.plugins.push(`${parts[0]}.${parts[1]}`);
    }
    await this.writeChePluginsJSON(pluginList);
  }

  async removePluginFromDevContainer(plugin: CheTheiaPlugin.Plugin, devContainer: DevfileComponent): Promise<boolean> {
    if (!devContainer.attributes) {
      return false;
    }

    let extensionsAttribute: string[] = devContainer.attributes['che-theia.eclipse.org/vscode-extensions'];
    if (!extensionsAttribute) {
      return false;
    }

    let changes = false;
    if (plugin.extensions) {
      for (const extension of plugin.extensions) {
        extensionsAttribute = extensionsAttribute.filter(value => value !== extension);
      }

      devContainer.attributes['che-theia.eclipse.org/vscode-extensions'] = extensionsAttribute;
      changes = true;
    }

    return changes;
  }

  async addPluginToDevContainer(plugin: CheTheiaPlugin.Plugin, devContainer: DevfileComponent): Promise<boolean> {
    let changes = false;

    if (!devContainer.attributes) {
      devContainer['attributes'] = {};
    }

    if (plugin.extensions) {
      if (!devContainer.attributes['che-theia.eclipse.org/vscode-extensions']) {
        devContainer.attributes['che-theia.eclipse.org/vscode-extensions'] = [];
      }

      const extensionsAttribute: string[] = devContainer.attributes['che-theia.eclipse.org/vscode-extensions'];
      for (const extension of plugin.extensions) {
        if (!extensionsAttribute.find(value => value === extension)) {
          extensionsAttribute.push(extension);

          changes = true;
        }
      }
    }

    if (plugin.preferences) {
      if (!devContainer.attributes['che-theia.eclipse.org/vscode-preferences']) {
        devContainer.attributes['che-theia.eclipse.org/vscode-preferences'] = {};
      }

      const preferencesAttribute: { [preferenceName: string]: string } =
        devContainer.attributes['che-theia.eclipse.org/vscode-preferences'];
      for (const prefName of Object.keys(plugin.preferences)) {
        const prefValue = plugin.preferences[prefName];
        preferencesAttribute[prefName] = prefValue;

        changes = true;
      }
    }

    return changes;
  }

  async downloadExtensions(installYamls: CheTheiaPlugin.Plugin[], devContainerName: string): Promise<string[]> {
    const downloadedExtensions: string[] = [];

    for (const yaml of installYamls) {
      // download .vsix files
      if (yaml.extensions) {
        for (const uri of yaml.extensions) {
          const sidecar = yaml.sidecar ? devContainerName : undefined;
          if (await this.isExtensionAlreadyDownloaded(uri, sidecar)) {
            continue;
          }

          try {
            const extensionFile = await this.downloadExtensionToPluginsDirectory(uri, sidecar);
            downloadedExtensions.push(extensionFile);
          } catch (error) {
            // rollback the installation
            for (const file of downloadedExtensions) {
              if (await fs.pathExists(file)) {
                await fs.remove(file);
              }
            }

            throw error;
          }
        }
      }
    }

    return downloadedExtensions;
  }

  async cleanupExtensions(removeYamls: CheTheiaPlugin.Plugin[], devContainerName: string): Promise<string[]> {
    const removedExtensions: string[] = [];

    for (const yaml of removeYamls) {
      if (yaml.sidecar) {
        // remove extension(s) from ${SIDECAR_PLUGINS_DIR}/{devContainerName} directory
        if (yaml.extensions) {
          for (const uri of yaml.extensions) {
            const fileName = path.basename(uri);
            const file = `${SIDECAR_PLUGINS_DIR}/${devContainerName}/${fileName}`;
            if (await fs.pathExists(file)) {
              await fs.remove(file);
            }
          }
        }
      } else {
        // remove extension(s) from ${PLUGINS_DIR} directory
        if (yaml.extensions) {
          for (const uri of yaml.extensions) {
            const fileName = path.basename(uri);
            const file = `${PLUGINS_DIR}/${fileName}`;
            if (await fs.pathExists(file)) {
              await fs.remove(file);
            }
          }
        }
      }
    }

    return removedExtensions;
  }

  async isExtensionAlreadyDownloaded(url: string, sidecar?: string): Promise<boolean> {
    const target = sidecar
      ? `${SIDECAR_PLUGINS_DIR}/${sidecar}/${path.basename(url)}`
      : `${PLUGINS_DIR}/${path.basename(url)}`;
    return fs.pathExists(target);
  }

  async downloadExtensionToPluginsDirectory(url: string, sidecar?: string): Promise<string> {
    let target;

    if (sidecar) {
      const directoryName = `${SIDECAR_PLUGINS_DIR}/${sidecar}`;
      await fs.ensureDir(directoryName);
      target = `${SIDECAR_PLUGINS_DIR}/${sidecar}/${path.basename(url)}`;
    } else {
      target = `${PLUGINS_DIR}/${path.basename(url)}`;
    }

    const response = await this.httpService.get(url, 'arraybuffer');
    if (response) {
      await fs.writeFile(target, response, { encoding: 'binary' });
      return target;
    }

    throw new Error(`Failure to download ${url}`);
  }

  findDevContainer(devfile: Devfile): DevfileComponent {
    // need to find definition
    const devContainerAttribute = 'che-theia.eclipse.org/dev-container';

    // first search if we have an optional annotated container
    const annotatedContainers = devfile.components?.filter(
      component =>
        component.attributes &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component.attributes as any)[devContainerAttribute] === true
    );
    if (annotatedContainers) {
      if (annotatedContainers.length === 1) {
        return annotatedContainers[0];
      } else if (annotatedContainers.length > 1) {
        throw new Error(`Only one container can be annotated with ${devContainerAttribute}: true`);
      }
    }

    // search in main devWorkspace (exclude theia as component name)
    const devComponents = devfile.components
      ?.filter(component => component.container && component.name !== 'theia-ide')
      .filter(
        // we should ignore component that do not mount the sources
        component => component.container && component.container.mountSources !== false
      )
      .filter(
        component =>
          !(component.attributes && component.attributes['app.kubernetes.io/part-of'] === 'che-theia.eclipse.org')
      );

    // only one, fine, else error
    if (!devComponents || devComponents.length === 0) {
      throw new Error('Not able to find any dev container component in DevWorkspace');
    } else if (devComponents.length === 1) {
      return devComponents[0];
    } else {
      console.warn(
        `More than one dev container component has been potentially found, taking the first one of ${devComponents.map(
          component => component.name
        )}`
      );
      return devComponents[0];
    }
  }

  async updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void> {
    console.log('Method [ updatePlugin ] not implemented.');
    throw new Error('Method not implemented.');
  }

  async deferredInstallation(): Promise<boolean> {
    return true;
  }
}
