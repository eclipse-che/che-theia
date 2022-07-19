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

  cachedPlugins: ChePluginMetadata[] = [];

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

  abstract updateCache(registries: ChePluginRegistries): Promise<void>;

  /**
   * Loads list of plugins from plugin registry.
   *
   * @param registry ChePluginRegistry plugin registry
   * @return list of available plugins
   */
  async loadPluginList(registry: ChePluginRegistry): Promise<ChePluginMetadataInternal[]> {
    const registryURI = registry.internalURI + '/plugins/';
    const registryContent = (await this.httpService.get(registryURI)) || '{}';
    return JSON.parse(registryContent) as ChePluginMetadataInternal[];
  }

  getBaseDirectory(registry: ChePluginRegistry): string {
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
