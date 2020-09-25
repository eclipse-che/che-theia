/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { HostedPluginUriPostProcessor } from '@theia/plugin-dev';
import { Endpoint, WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

@injectable()
export class CheWorkspaceHostedPluginUriPostProcessor implements HostedPluginUriPostProcessor {

    @inject(WorkspaceService)
    protected workspaceService: WorkspaceService;

    constructor() {
    }

    async processUri(uri: URI): Promise<URI> {
        const hostedPluginTheiaInstanceServer = await this.getHostedPluginTheiaInstanceServer();
        if (!hostedPluginTheiaInstanceServer) {
            throw new Error('No server with type "ide-dev" found.');
        }

        return new URI(hostedPluginTheiaInstanceServer.url);
    }

    /**
     * Searches for endpoint which exposes hosted Theia instance.
     * The endpoint label is the attribute "type": "ide-dev".
     */
    protected async getHostedPluginTheiaInstanceServer(): Promise<Endpoint | undefined> {
        const workspace = await this.workspaceService.currentWorkspace();
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

    async processOptions(options: object): Promise<object> {
        return options;
    }

}
