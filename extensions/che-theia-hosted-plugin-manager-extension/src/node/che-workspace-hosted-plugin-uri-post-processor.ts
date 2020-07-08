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
import URI from '@theia/core/lib/common/uri';
import { HostedPluginUriPostProcessor } from '@theia/plugin-dev';
import WorkspaceClient, { IRemoteAPI } from '@eclipse-che/workspace-client';
import { che } from '@eclipse-che/api';

@injectable()
export class CheWorkspaceHostedPluginUriPostProcessor implements HostedPluginUriPostProcessor {

    protected restApiClient: IRemoteAPI;

    constructor() {
        this.restApiClient = WorkspaceClient.getRestApi({
            baseUrl: process.env.CHE_API,
            machineToken: process.env.CHE_MACHINE_TOKEN
        });
    }

    async processUri(uri: URI): Promise<URI> {
        const hostedPluginTheiaInstanceServer = await this.getHostedPluginTheiaInstanceServer();
        if (!hostedPluginTheiaInstanceServer) {
            throw new Error('No server with type "ide-dev" found.');
        }

        return new URI(hostedPluginTheiaInstanceServer.url);
    }

    /**
     * Searches for server which exposes hosted Theia instance.
     * The server label is the attribute "type": "ide-dev".
     */
    protected async getHostedPluginTheiaInstanceServer(): Promise<che.workspace.Server | undefined> {
        const workspace = await this.getCurrentWorkspace();
        if (!workspace.runtime) {
            throw new Error('Workspace is not running.');
        }

        const machines = workspace.runtime.machines!;
        for (const machineName in machines) {
            if (!machines.hasOwnProperty(machineName)) {
                continue;
            }
            const servers = machines[machineName].servers!;
            for (const serverName in servers) {
                if (!servers.hasOwnProperty(serverName)) {
                    continue;
                }
                const serverAttributes = servers[serverName].attributes;
                if (serverAttributes && serverAttributes['type'] === 'ide-dev') {
                    return servers[serverName];
                }
            }
        }
        return undefined;
    }

    protected getCurrentWorkspace(): Promise<che.workspace.Workspace> {
        const workspaceId = process.env.CHE_WORKSPACE_ID;
        if (!workspaceId) {
            throw new Error('Environment variable CHE_WORKSPACE_ID is not set.');
        }
        return this.restApiClient.getById<che.workspace.Workspace>(workspaceId);
    }

    async processOptions(options: object): Promise<object> {
        return options;
    }

}
