/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { Plugin, emptyPlugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { ExtPluginApiFrontendInitializationFn } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { createAPIFactory } from '../che-api';
import * as che from '@eclipse-che/plugin';

// tslint:disable-next-line:no-any
const ctx = self as any;
const pluginsApiImpl = new Map<string, typeof che>();
let defaultApi: typeof che;

export const initializeApi: ExtPluginApiFrontendInitializationFn = (rpc: RPCProtocol, plugins: Map<string, Plugin>) => {
    const cheApiFactory = createAPIFactory(rpc);
    const handler = {
        // tslint:disable-next-line:no-any
        get: (target: any, name: string) => {
            const plugin = plugins.get(name);
            if (plugin) {
                let apiImpl = pluginsApiImpl.get(plugin.model.id);
                if (!apiImpl) {
                    apiImpl = cheApiFactory(plugin);
                    pluginsApiImpl.set(plugin.model.id, apiImpl);
                }
                return apiImpl;
            }

            if (!defaultApi) {
                defaultApi = cheApiFactory(emptyPlugin);
            }

            return defaultApi;
        }
    };

    // tslint:disable-next-line:no-null-keyword
    ctx['che'] = new Proxy(Object.create(null), handler);
};
