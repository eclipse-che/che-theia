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
import { HostedPluginClient, ServerPluginRunner, PluginMetadata } from '@theia/plugin-ext/src/common/plugin-protocol';
import { HostedPluginRemote } from './hosted-plugin-remote';

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

    // tslint:disable-next-line:no-any
    public acceptMessage(jsonMessage: any): boolean {
        return jsonMessage.pluginID !== undefined;
    }

    // tslint:disable-next-line:no-any
    public onMessage(jsonMessage: any): void {
        // do routing on the message
        if (this.hostedPluginRemote.hasEndpoint(jsonMessage.pluginID)) {
            this.hostedPluginRemote.onMessage(jsonMessage);
        } else {
            this.defaultRunner.onMessage(jsonMessage.content);
        }

    }

    getExtraPluginMetadata(): Promise<PluginMetadata[]> {
        return this.hostedPluginRemote.getExtraPluginMetadata();
    }

}
