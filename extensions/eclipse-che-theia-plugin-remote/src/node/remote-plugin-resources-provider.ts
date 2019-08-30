/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { PluginResourcesProvider } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { HostedPluginRemote } from './hosted-plugin-remote';

@injectable()
export class RemotePluginResourcesProvider implements PluginResourcesProvider {

    // To be set on connection creation
    // If there are more than one cnnection, the last one will be used.
    private hostedPluginRemote: HostedPluginRemote;

    hasResources(pluginId: string): boolean {
        if (this.hostedPluginRemote) {
            return this.hostedPluginRemote.hasEndpoint(pluginId);
        }
        return false;
    }

    getResource(pluginId: string, resourcePath: string): Promise<Buffer | undefined> {
        if (this.hostedPluginRemote) {
            return this.hostedPluginRemote.requestPluginResource(pluginId, resourcePath);
        }
        return undefined;
    }

    setRemotePluginConnection(hostedPluginRemote: HostedPluginRemote): void {
        this.hostedPluginRemote = hostedPluginRemote;
    }

}
