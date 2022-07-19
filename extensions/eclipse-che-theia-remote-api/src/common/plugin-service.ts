/**********************************************************************
 * Copyright (c) 2019-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { JsonRpcServer } from '@theia/core';

export interface ChePluginRegistry {
  // Display name
  name: string;
  // Registry internal URI, is used for cross-container comnmunication.
  // Should not contain a trailing slash.
  internalURI: string;
  // Public URI to access the registry resources from browser.
  // Should not contain a trailing slash.
  publicURI: string;
}

/**
 * Describes properties in plugin meta.yaml
 */
export interface ChePluginMetadata {
  publisher: string;
  name: string;
  version: string;
  type: string;
  displayName: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  repository: string;
  firstPublicationDate: string;
  category: string;
  latestUpdateDate: string;

  // Plugin KEY. Used to set in workpsace configuration
  key: string;
  builtIn: boolean;

  // to be compatible with dev workspaces
  dependencies?: string[];
  extensions?: string[];
}

/**
 * Need to have this interface to pass list of Plugin registries through RPC.
 *
 * https://github.com/eclipse-theia/theia/issues/4310
 * https://github.com/eclipse-theia/theia/issues/4757
 * https://github.com/eclipse-theia/theia/issues/4343
 */
export interface ChePluginRegistries {
  [name: string]: ChePluginRegistry;
}

export interface Changes {
  toInstall: string[];
  toRemove: string[];
}

export const chePluginServicePath = '/che-plugin-service';

export const ChePluginService = Symbol('ChePluginService');
export interface ChePluginService extends JsonRpcServer<ChePluginServiceClient> {
  disconnectClient(client: ChePluginServiceClient): void;

  /**
   * Returns default plugin registry;
   */
  getDefaultRegistry(): Promise<ChePluginRegistry>;

  /**
   * Updates the plugin cache
   *
   * @param registryList list of plugin registries
   */
  updateCache(registries: ChePluginRegistries): Promise<void>;

  /**
   * Returns a list of available plugins on the plugin registry.
   *
   * @return list of available plugins
   */
  getPlugins(): Promise<ChePluginMetadata[]>;

  /**
   * Returns list of installed plugins.
   */
  getInstalledPlugins(): Promise<string[]>;

  /**
   * Adds a plugin to current workspace.
   *
   * @param plugin plugin id in format `publisher/name/version`
   */
  installPlugin(plugin: string): Promise<boolean>;

  /**
   * Removes a plugin from current workspace.
   *
   * @param plugin plugin id in format `publisher/name/version`
   * Throws an error with explanation message if the plugin cannot be removed.
   */
  removePlugin(plugin: string): Promise<void>;

  /**
   * Updates the plugin / changes the plugin version.
   */
  updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void>;

  /**
   * Returns true, if the plugin service does not apply changes instantly.
   * To complete the installation, client must call persist();
   */
  deferredInstallation(): Promise<boolean>;

  /**
   * Returns list of changes, that have been performed by the user but not yet applied.
   */
  getUnpersistedChanges(): Promise<Changes | undefined>;

  /**
   * Applies all the changes to the devfile.
   */
  persist(): Promise<void>;
}

export interface PluginDependencies {
  plugins: string[];
}

export const ChePluginServiceClient = Symbol('ChePluginServiceClient');
export interface ChePluginServiceClient {
  /**
   * Called by Plugins Service when amount of available plugins has been changed.
   */
  notifyPluginCacheSizeChanged(plugins: number): Promise<void>;

  /**
   * Called by Plugin Service when amount of cached plugins has been changed.
   */
  notifyPluginCached(plugins: number): Promise<void>;

  /**
   * Called by Plugin Service when caching of the plugins has been finished.
   */
  notifyCachingComplete(): Promise<void>;

  /**
   * Called by Plugin Service when invalid registry has been found while updating plugin cache.
   */
  invalidRegistryFound(registry: ChePluginRegistry): Promise<void>;

  /**
   * Called by Plugin Service when invalid plugin meta.yaml has been found while updating plugin cache.
   */
  invalidPluginFound(pluginYaml: string): Promise<void>;

  /**
   * Called by Plugin Service to ask the user to install plugin dependencies.
   *
   * @param plugins list of dependencies
   */
  askToInstallDependencies(dependencies: PluginDependencies): Promise<boolean>;
}
