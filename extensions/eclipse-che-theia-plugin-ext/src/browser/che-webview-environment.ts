/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject, postConstruct } from 'inversify';
import { CheApiService } from '../common/che-protocol';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { WebviewEnvironment } from '@theia/plugin-ext/lib/main/browser/webview/webview-environment';
import { WebviewExternalEndpoint } from '@theia/plugin-ext/lib/main/common/webview-protocol';
import { che as cheApi } from '@eclipse-che/api';

@injectable()
export class CheWebviewEnvironment extends WebviewEnvironment {

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    @inject(CheApiService)
    private cheApi: CheApiService;

    @postConstruct()
    protected async init(): Promise<void> {
        try {
            const variable = await this.environments.getValue(WebviewExternalEndpoint.pattern);
            const containers = await this.cheApi.getCurrentWorkspacesContainers();
            const ideServer = this.findIdeServer(containers);
            let domain;
            if (ideServer && ideServer.url) {
                domain = this.getUrlDomain(ideServer.url);
            }
            const hostName = variable && variable.value || domain || WebviewExternalEndpoint.pattern;
            this.externalEndpointHost.resolve(hostName.replace('{{hostname}}', window.location.host || 'localhost'));
        } catch (e) {
            this.externalEndpointHost.reject(e);
        }
    }

    private findIdeServer(containers: { [key: string]: cheApi.workspace.Machine }): cheApi.workspace.Server | undefined {
        try {
            if (containers) {
                for (const containerName of Object.keys(containers)) {
                    const servers = containers[containerName].servers;
                    if (servers) {
                        for (const serverName of Object.keys(servers)) {
                            const server = servers[serverName];
                            if (server && server.attributes && server.attributes['type'] === 'ide') {
                                return server;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            throw new Error(`Unable to get workspace servers. Cause: ${e}`);
        }
        return undefined;
    }

    private getUrlDomain(routeUrl: string): string {
        // Remove trailing slash if any
        if (routeUrl.endsWith('/')) {
            routeUrl = routeUrl.substring(0, routeUrl.length - 1);
        }
        // Remove protocol
        const webviewDomain = routeUrl.replace(/^https?:\/\//, '');

        return webviewDomain;
    }
}
