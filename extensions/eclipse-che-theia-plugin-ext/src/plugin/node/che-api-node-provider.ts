/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { Plugin, emptyPlugin, PluginManager } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { ExtPluginApiBackendInitializationFn } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import * as che from '@eclipse-che/plugin';
import { CheApiFactory, createAPIFactory } from '../che-api';

const pluginsApiImpl = new Map<string, typeof che>();
let defaultApi: typeof che;
let isLoadOverride = false;
let cheApiFactory: CheApiFactory;
let plugins: PluginManager;

export const provideApi: ExtPluginApiBackendInitializationFn = (rpc: RPCProtocol, pluginManager: PluginManager) => {
    cheApiFactory = createAPIFactory(rpc);
    plugins = pluginManager;

    if (!isLoadOverride) {
        overrideInternalLoad();
        isLoadOverride = true;
    }

};

function overrideInternalLoad(): void {
    const module = require('module');
    // save original load method
    const internalLoad = module._load;

    // if we try to resolve che module, return the filename entry to use cache.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    module._load = function (request: string, parent: any, isMain: {}): any {
        if (request !== '@eclipse-che/plugin') {
            return internalLoad.apply(this, arguments);
        }

        const plugin = findPlugin(parent.filename);
        if (plugin) {
            let apiImpl = pluginsApiImpl.get(plugin.model.id);
            if (!apiImpl) {
                apiImpl = cheApiFactory(plugin);
                pluginsApiImpl.set(plugin.model.id, apiImpl);
            }
            return apiImpl;
        }

        if (!defaultApi) {
            console.warn(`Could not identify plugin for 'Che' require call from ${parent.filename}`);
            defaultApi = cheApiFactory(emptyPlugin);
        }

        return defaultApi;
    };
}

function findPlugin(filePath: string): Plugin | undefined {
    return plugins.getAllPlugins().find(plugin => filePath.startsWith(plugin.pluginFolder));
}

export default provideApi;
