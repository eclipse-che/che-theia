/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { HostedPluginClient, ServerPluginRunner } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { DeployedPlugin } from '@theia/plugin-ext';

/**
 * Proxy runner being a facade for loading plugins locally or remotely
 */
@injectable()
export class ServerPluginProxyRunner implements ServerPluginRunner {

    @inject(HostedPluginRemote)
    protected readonly hostedPluginRemote: HostedPluginRemote;

    private defaultRunner: ServerPluginRunner;

    public setDefault(defaultRunner: ServerPluginRunner): void {
        this.defaultRunner = defaultRunner;
    }

    public setClient(client: HostedPluginClient): void {
        this.hostedPluginRemote.setClient(client);
    }

    public clientClosed(): void {
        this.hostedPluginRemote.clientClosed();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public acceptMessage(jsonMessage: any): boolean {
        return jsonMessage.pluginID !== undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public onMessage(jsonMessage: any): void {
        // do routing on the message
        if (this.hostedPluginRemote.hasEndpoint(jsonMessage.pluginID)) {
            this.hostedPluginRemote.onMessage(jsonMessage);
        } else {
            this.defaultRunner.onMessage(jsonMessage.content);
        }

    }

    /**
     * Provides additional deployed plugins.
     */
    public getExtraDeployedPlugins(): Promise<DeployedPlugin[]> {
        return this.hostedPluginRemote.getExtraDeployedPlugins();
    }

    /**
     * Provides additional plugin ids.
     */
    public getExtraDeployedPluginIds(): Promise<string[]> {
        return this.hostedPluginRemote.getExtraDeployedPluginIds();
    }

}
