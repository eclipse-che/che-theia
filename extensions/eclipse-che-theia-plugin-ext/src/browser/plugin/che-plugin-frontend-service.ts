/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import {
    HostedPluginServer,
    PluginMetadata
} from '@theia/plugin-ext/lib/common/plugin-protocol';

import {
    ChePluginMetadata
} from '../../common/che-protocol';

@injectable()
export class ChePluginFrontentService {

    @inject(HostedPluginServer)
    protected readonly hostedPluginServer: HostedPluginServer;

    async getDeployedPlugins(filter: string): Promise<ChePluginMetadata[]> {
        if (this.hasType(filter, '@installed')) {
            let pluginList = await this.getAllDeployedPlugins();
            pluginList = this.filter(pluginList, filter);
            return pluginList;
        }

        return [];
    }

    // @installed
    // @builtin
    // @enabled
    // @disabled
    hasType(filter: string, type: string) {
        if (filter) {
            const filters = filter.split(' ');
            const found = filters.find(value => value === type);
            return found !== undefined;
        }

        return false;
    }

    filterByType(plugins: ChePluginMetadata[], type: string): ChePluginMetadata[] {
        return plugins.filter(plugin => {
            const regex = / /gi;
            const t = plugin.type.toLowerCase().replace(regex, '_');
            return t === type;
        });
    }

    filterByText(plugins: ChePluginMetadata[], text: string): ChePluginMetadata[] {
        return plugins;
    }

    filter(plugins: ChePluginMetadata[], filter: string): ChePluginMetadata[] {
        let filteredPlugins = plugins;
        const filters = filter.split(' ');

        filters.forEach(f => {
            if (f) {
                if (f.startsWith('@')) {
                    if (f.startsWith('@type:')) {
                        const type = f.substring('@type:'.length);
                        filteredPlugins = this.filterByType(filteredPlugins, type);
                    }
                } else {
                    filteredPlugins = this.filterByText(filteredPlugins, f);
                }
            }
        });

        return filteredPlugins;
    }

    private async getAllDeployedPlugins(): Promise<ChePluginMetadata[]> {
        const metadata = await this.hostedPluginServer.getDeployedMetadata();

        const plugins: ChePluginMetadata[] = await Promise.all(
            metadata.map(async (meta: PluginMetadata) => {
                const publisher = meta.source.publisher;
                const name = meta.source.name;
                const version = meta.source.version;
                const type = this.determinePluginType(meta);
                const displayName = meta.source.displayName ? meta.source.displayName : meta.source.name;

                const title = name;

                const description = meta.source.description;

                // tslint:disable-next-line:no-any
                const icon = (meta.source as any).icon;

                const plugin = {
                    publisher,
                    name,
                    version,
                    type,
                    displayName,
                    title,
                    description,
                    icon,
                    url: 'string',
                    repository: 'string',
                    firstPublicationDate: 'string',
                    category: 'string',
                    latestUpdateDate: 'string',

                    // Plugin KEY. Used to set in workpsace configuration
                    key: `${publisher}/${name}/${version}`
                };

                return plugin;

            }
            ));

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

        return 'test';
    }

}
