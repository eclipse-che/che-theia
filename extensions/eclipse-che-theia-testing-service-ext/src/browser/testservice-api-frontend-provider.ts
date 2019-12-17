/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
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
import * as testService from '@eclipse-che/testing-service';
import { createAPIFactory } from '../plugin/testservice-api';

// tslint:disable-next-line:no-any
const ctx = self as any;
const pluginsApiImpl = new Map<string, typeof testService>();
let defaultApi: typeof testService;

export const initializeApi: ExtPluginApiFrontendInitializationFn = (rpc: RPCProtocol, plugins: Map<string, Plugin>) => {
    const TestServiceApiFactory = createAPIFactory(rpc);
    const handler = {
        // tslint:disable-next-line:no-any
        get: (target: any, name: string) => {
            const plugin = plugins.get(name);
            if (plugin) {
                let apiImpl = pluginsApiImpl.get(plugin.model.id);
                if (!apiImpl) {
                    apiImpl = TestServiceApiFactory(plugin);
                    pluginsApiImpl.set(plugin.model.id, apiImpl);
                }
                return apiImpl;
            }

            if (!defaultApi) {
                defaultApi = TestServiceApiFactory(emptyPlugin);
            }

            return defaultApi;
        }
    };

    // tslint:disable-next-line:no-null-keyword
    ctx['test'] = new Proxy(Object.create(null), handler);
};
