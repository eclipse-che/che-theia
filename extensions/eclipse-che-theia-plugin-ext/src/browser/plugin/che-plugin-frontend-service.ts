/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DeployedPlugin, HostedPluginServer, PluginMetadata } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { inject, injectable } from 'inversify';

import { ChePluginMetadata } from '../../common/che-plugin-protocol';
import { PluginFilter } from '../../common/plugin/plugin-filter';

@injectable()
export class ChePluginFrontentService {
  @inject(HostedPluginServer)
  protected readonly hostedPluginServer: HostedPluginServer;

  // returns a list of built-in plugins when filter contains '@builtin'
  async getBuiltInPlugins(filter: string): Promise<ChePluginMetadata[]> {
    let pluginList = await this.getAllDeployedPlugins();
    pluginList = PluginFilter.filterPlugins(pluginList, filter);
    return pluginList;
  }

  /**
   * Returns non-filtered list of the deployed plugins.
   */
  private async getAllDeployedPlugins(): Promise<ChePluginMetadata[]> {
    const pluginIds = await this.hostedPluginServer.getDeployedPluginIds();
    const metadata = await this.hostedPluginServer.getDeployedPlugins({ pluginIds });

    const plugins: ChePluginMetadata[] = metadata.map((meta: DeployedPlugin) => {
      const publisher = meta.metadata.model.publisher;
      const name = meta.metadata.model.name;
      const version = meta.metadata.model.version;
      const type = this.determinePluginType(meta.metadata);
      const displayName = meta.metadata.model.displayName ? meta.metadata.model.displayName : meta.metadata.model.name;

      const title = name;

      const description = meta.metadata.model.description;

      // Temporary disabled.
      // We don't have an ability for now to display icons from the file system.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // const icon = (meta.source as any).icon;

      return {
        publisher,
        name,
        version,
        type,
        displayName,
        title,
        description,
        icon: '',
        url: '',
        repository: '',
        firstPublicationDate: '',
        category: '',
        latestUpdateDate: '',

        // Plugin KEY. Used to set in workspace configuration
        key: `${publisher}/${name}/${version}`,
        builtIn: true,
      };
    });

    return plugins;
  }

  private determinePluginType(meta: PluginMetadata): string {
    if (meta && meta.model && meta.model.engine && meta.model.engine.type) {
      if ('vscode' === meta.model.engine.type) {
        return 'VS Code extension';
      } else if ('theiaPlugin' === meta.model.engine.type) {
        return 'Theia plugin';
      }
    }

    return '';
  }
}
