/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { HostedPluginSupport, PluginHost, PluginContributions } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin';
import { DisposableCollection } from '@theia/core';
import { injectable } from 'inversify';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { MAIN_REMOTE_RPC_CONTEXT } from '../common/plugin-remote-rpc';
import { PluginRemoteBrowserImpl } from '../node/plugin-remote-browser-impl';
import { DeployedPlugin, PluginManagerExt } from '@theia/plugin-ext/lib/common';

/**
 * Extends Theia hosted plugin to notify all sidecar hosts the list of other plug-ins that can be found in other places.
 */
@injectable()
export class BrowserRemoteHostedPluginSupport extends HostedPluginSupport {

    private rpcs: Map<string, RPCProtocol>;
    private contributionsByHost: Map<PluginHost, PluginContributions[]>;
    private pluginRemoteBrowser: PluginRemoteBrowserImpl;
    private initializedPlugins: Promise<void>[];

    constructor() {
        super();
        this.rpcs = new Map<string, RPCProtocol>();
        this.pluginRemoteBrowser = new PluginRemoteBrowserImpl(this.rpcs);
        this.initializedPlugins = [];
    }

    /**
     * Send all hosts the plugins that are available
     */
    protected initRpc(host: PluginHost, pluginId: string): RPCProtocol {
        const rpc = super.initRpc(host, pluginId);
        rpc.set(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_BROWSER, this.pluginRemoteBrowser);
        this.rpcs.set(host, rpc);

        const pluginRemoteExt = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);

        // get all plugins that are not for a given host
        const externalPlugins: DeployedPlugin[] = [];
        Array.from(this.contributionsByHost.keys()).forEach(pluginHost => {
            if (host !== pluginHost) {
                const contribs: PluginContributions[] = this.contributionsByHost.get(pluginHost)!;
                return contribs.forEach(contrib => {
                    externalPlugins.push(contrib.plugin);
                });
            }
        });
        const initPromise = pluginRemoteExt.$initExternalPlugins(externalPlugins);
        this.initializedPlugins.push(initPromise);
        return rpc;
    }

    /**
     * Wait promises of initialized plugins before returning manager.
     */
    protected async obtainManager(host: string, hostContributions: PluginContributions[], toDisconnect: DisposableCollection): Promise<PluginManagerExt | undefined> {
        const manager = await super.obtainManager(host, hostContributions, toDisconnect);
        await Promise.all(this.initializedPlugins);
        return manager;
    }

    /**
     * Add mapping before starting plugins
     */
    protected async startPlugins(contributionsByHost: Map<PluginHost, PluginContributions[]>, toDisconnect: DisposableCollection): Promise<void> {
        this.contributionsByHost = contributionsByHost;

        Array.from(this.contributionsByHost.values()).map(element => {
            element.map((pluginContribution: PluginContributions) => {
                const host = pluginContribution.plugin.metadata.host;
                const id = pluginContribution.plugin.metadata.model.id;
                this.pluginRemoteBrowser.addMapping(id, host);
            });
        });
        return super.startPlugins(contributionsByHost, toDisconnect);
    }

}
