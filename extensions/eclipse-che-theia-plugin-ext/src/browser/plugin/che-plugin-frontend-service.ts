/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
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
import { HostedPluginServer, PluginMetadata } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { ChePluginMetadata } from '../../common/che-protocol';
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
        const metadata = await this.hostedPluginServer.getDeployedMetadata();

        const plugins: ChePluginMetadata[] = metadata.map((meta: PluginMetadata) => {
            const publisher = meta.source.publisher;
            const name = meta.source.name;
            const version = meta.source.version;
            const type = this.determinePluginType(meta);
            const displayName = meta.source.displayName ? meta.source.displayName : meta.source.name;

            const title = name;

            const description = meta.source.description;

            // Temporary disabled.
            // We don't have an ability for now to display icons from the file system.
            // tslint:disable-next-line:no-any
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
                builtIn: true
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
