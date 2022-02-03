/**********************************************************************
 * Copyright (c) 2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DevfileComponent, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { WorkspaceService, WorkspaceSettings } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import { ChePluginRegistry } from '@eclipse-che/theia-remote-api/lib/common/plugin-service';
import { PluginServiceImpl } from '@eclipse-che/theia-remote-api/lib/common/plugin-service-impl';

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
