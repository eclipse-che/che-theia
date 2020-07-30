/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as net from 'net';
import * as http from 'http';
import * as ws from 'ws';

import { inject, injectable, Container } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { MessagingContribution } from '@theia/core/lib/node/messaging/messaging-contribution';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';

@injectable()
export class CheMessagingContribution extends MessagingContribution {

    private connectionContainers: Set<Container> = new Set();
    private connectionContainersMap: Map<ws, Container> = new Map();

    @inject(CheApiService)
    protected cheApiService: CheApiService;

    /**
     * Keep reference to containers used by connections
     */
    protected createSocketContainer(socket: ws): Container {
        const connectionContainer: Container = super.createSocketContainer(socket);
        this.connectionContainers.add(connectionContainer);
        this.connectionContainersMap.set(socket, connectionContainer);
        socket.on('close', () => {
            const toDeleteContainer = this.connectionContainersMap.get(socket);
            this.connectionContainersMap.delete(socket);
            if (toDeleteContainer) {
                this.connectionContainers.delete(toDeleteContainer);
            }
        });
        return connectionContainer;
    }

    protected async handleHttpUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer): Promise<void> {
        if (await this.isRequestAllowed(request)) {
            super.handleHttpUpgrade(request, socket, head);
        } else {
            console.error(`Refused a WebSocket connection: ${request.connection.remoteAddress}`);
            socket.destroy();
        }
    }

    async isRequestAllowed(request: http.IncomingMessage): Promise<boolean> {
        const theiaEndpoints = [];
        try {
            const containers = await this.cheApiService.getCurrentWorkspacesContainers();
            for (const containerName of Object.keys(containers)) {
                const servers = containers[containerName].servers;
                if (servers) {
                    for (const serverName of Object.keys(servers)) {
                        const server = servers[serverName];
                        if (serverName === 'theia' || serverName === 'theia-dev' || serverName === 'theia-dev-flow') {
                            theiaEndpoints.push(new URI(server.url));
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            return true; // we're outside of Che Workspace, so allow a request
        }

        const requestOrigin = request.headers.origin;
        if (typeof requestOrigin !== 'string') {
            return false;
        }
        const requestOriginURI = new URI(requestOrigin);

        return theiaEndpoints.some(uri => requestOriginURI.isEqualOrParent(uri));
    }

    public getConnectionContainers(): Container[] {
        return Array.from(this.connectionContainers);
    }
}
