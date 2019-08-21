/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { PluginManagerExtImpl, PluginHost } from '@theia/plugin-ext/lib/plugin/plugin-manager';
import { EnvExtImpl } from '@theia/plugin-ext/lib/plugin/env';
import { PreferenceRegistryExtImpl } from '@theia/plugin-ext/lib/plugin/preference-registry';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PluginInitData, ConfigStorage, PLUGIN_RPC_CONTEXT, MAIN_RPC_CONTEXT } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { KeyValueStorageProxy } from '@theia/plugin-ext/lib/plugin/plugin-storage';

export class RemotePluginManagerExtImpl extends PluginManagerExtImpl {
    private startPluginFn: Function;
    constructor(
        private readonly myHost: PluginHost,
        private readonly myEnvExt: EnvExtImpl,
        private readonly myPreferencesManager: PreferenceRegistryExtImpl,
        private readonly myRpc: RPCProtocol
    ) {
        super(myHost, myEnvExt, myPreferencesManager, myRpc);
    }

    async $init(pluginInit: PluginInitData, configStorage: ConfigStorage): Promise<void> {
        // tslint:disable-next-line: no-any
        (this as any).storageProxy = this.myRpc.set(
            MAIN_RPC_CONTEXT.STORAGE_EXT,
            new KeyValueStorageProxy(this.myRpc.getProxy(PLUGIN_RPC_CONTEXT.STORAGE_MAIN),
                pluginInit.globalState,
                pluginInit.workspaceState)
        );

        // init query parameters
        this.myEnvExt.setQueryParameters(pluginInit.env.queryParams);
        this.myEnvExt.setLanguage(pluginInit.env.language);

        this.myPreferencesManager.init(pluginInit.preferences);

        if (pluginInit.extApi) {
            this.myHost.initExtApi(pluginInit.extApi);
        }

        this.startPluginFn = async () => {
            const [plugins, foreignPlugins] = this.myHost.init(pluginInit.plugins);
            // add foreign plugins
            for (const plugin of foreignPlugins) {
                this.registerPlugin(plugin, configStorage);
            }
            // add own plugins, before initialization
            for (const plugin of plugins) {
                this.registerPlugin(plugin, configStorage);
            }

            // run eager plugins
            await this.$activateByEvent('*');
            for (const activationEvent of pluginInit.activationEvents) {
                await this.$activateByEvent(activationEvent);
            }

            if (this.myHost.loadTests) {
                return this.myHost.loadTests();
            }
            this.fireOnDidChange();
        };

        return Promise.resolve();
    }

    startPlugins(): void {
        if (this.startPluginFn) {
            this.startPluginFn();
        }
    }
}
