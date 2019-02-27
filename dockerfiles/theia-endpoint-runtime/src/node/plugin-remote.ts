/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as http from 'http';
import * as ws from 'ws';
import 'reflect-metadata';
import { logger } from '@theia/core';
import { ILogger } from '@theia/core/lib/common';
import { Emitter } from '@theia/core/lib/common/event';
import { MAIN_RPC_CONTEXT, PluginDeployer, PluginDeployerEntry, PluginMetadata } from '@theia/plugin-ext';
import pluginVscodeBackendModule from '@theia/plugin-ext-vscode/lib/node/plugin-vscode-backend-module';
import { RPCProtocolImpl } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { PluginDeployerHandler } from '@theia/plugin-ext/lib/common';
import { PluginHostRPC } from '@theia/plugin-ext/lib/hosted/node/plugin-host-rpc';
import { HostedPluginReader } from '@theia/plugin-ext/lib/hosted/node/plugin-reader';
import pluginExtBackendModule from '@theia/plugin-ext/lib/plugin-ext-backend-module';
import { Container, inject, injectable } from 'inversify';
import { DummyTraceLogger } from './dummy-trace-logger';
import { HostedPluginRemote } from './hosted-plugin-remote';
import pluginRemoteBackendModule from './plugin-remote-backend-module';
import { TerminalContainerAware } from './terminal-container-aware';

/**
 * Entry point of a Remote Endpoint. It is executed as a new separate nodejs process.
 * It is using inversify to bind all the stuff.
 * @author Florent Benoit
 */

process.on('SIGINT', () => {
    process.exit();
});

// configured port number
const PLUGIN_PORT = parseInt(process.env.THEIA_PLUGIN_ENDPOINT_PORT || '2503', 10);

// start websocket server
const WebSocketServerImpl = ws.Server;

const webSocketServer = new WebSocketServerImpl({ port: PLUGIN_PORT });

interface CheckAliveWS extends ws {
    alive: boolean;
}

// check alive
const checkAliveTimeout = 30000;
webSocketServer.on('connection', (socket: CheckAliveWS, request: http.IncomingMessage) => {
    socket.alive = true;
    socket.on('pong', () => socket.alive = true);
    handleConnection(socket, request);
});
setInterval(() => {
    webSocketServer.clients.forEach((socket: CheckAliveWS) => {
        if (socket.alive === false) {
            return socket.terminate();
        }
        socket.alive = false;
        socket.ping();
    });
}, checkAliveTimeout);

// store session ID
let sessionId = 0;

/**
 * Wrapper for adding Message ID on every message that is sent.
 */
class WebSocketClient {

    public rpc: RPCProtocolImpl;
    // tslint:disable-next-line:no-any
    public emitter: Emitter<any>;

    constructor(private readonly id: number, private socket: ws) {
    }

    public getIdentifier(): number {
        return this.id;
    }

    // message is a JSON entry
    // tslint:disable-next-line:no-any
    send(message: any) {
        this.socket.send(JSON.stringify(message));
    }

}

// list of clients
const webSocketClients = new Map<number, WebSocketClient>();

// create a new client on top of socket
function newClient(id: number, socket: ws): WebSocketClient {
    const webSocketClient = new WebSocketClient(id, socket);
    const emitter = new Emitter();
    webSocketClient.emitter = emitter;
    webSocketClient.rpc = new RPCProtocolImpl({
        onMessage: emitter.event,
        // send messages to this client
        send: (m: {}) => {
            webSocketClient.send(m);
        }
    });

    const pluginHostRPC = new PluginHostRPC(webSocketClient.rpc);
    pluginHostRPC.initialize();

    // override window.createTerminal to be container aware
    // tslint:disable-next-line:no-any
    new TerminalContainerAware().overrideTerminal((webSocketClient.rpc as any).locals[MAIN_RPC_CONTEXT.TERMINAL_EXT.id]);

    return webSocketClient;
}

// Handle the connection received
function handleConnection(socket: ws, request: http.IncomingMessage): void {
    // create channel for discussing with this new client
    const channelId = sessionId++;
    const client = newClient(channelId, socket);
    webSocketClients.set(channelId, client);

    socket.on('error', err => {
    });

    socket.on('close', (code, reason) => {
        webSocketClients.clear();
    });

    socket.on('message', (data: ws.Data) => {
        const jsonParsed = JSON.parse(data.toString());

        // handle local call
        if (jsonParsed.internal) {
            // asked to grab metadata, send them
            if (jsonParsed.internal.metadata && 'request' === jsonParsed.internal.metadata) {
                // apply host on all local metadata
                currentBackendPluginsMetadata.forEach(metadata => metadata.host = jsonParsed.internal.endpointName);
                const metadataResult = {
                    'internal': {
                        'endpointName': jsonParsed.internal.endpointName,
                        'metadata': {
                            'result': currentBackendPluginsMetadata
                        }
                    }
                };

                client.send(metadataResult);
            }
            return;
        }

        for (const webSocketClient of webSocketClients.values()) {
            // send what is inside the message (wrapped message)
            try {
                webSocketClient.emitter.fire(jsonParsed);
            } catch (e) {
                console.error(e);
            }
        }
    });
}

const currentBackendPluginsMetadata: PluginMetadata[] = [];

@injectable()
class PluginDeployerHandlerImpl implements PluginDeployerHandler {

    @inject(ILogger)
    protected readonly logger: ILogger;

    constructor(
        @inject(HostedPluginReader) private readonly reader: HostedPluginReader,
    ) {
        this.reader.initialize();
    }

    async deployFrontendPlugins(frontendPlugins: PluginDeployerEntry[]): Promise<void> {
        if (frontendPlugins.length > 0) {
            logger.error('Frontend plug-in cannot be deployed in sidecar container');
        }
    }

    async deployBackendPlugins(backendPlugins: PluginDeployerEntry[]): Promise<void> {
        for (const plugin of backendPlugins) {
            const metadata = await this.reader.getPluginMetadata(plugin.path());
            if (metadata) {
                currentBackendPluginsMetadata.push(metadata);
                const path = metadata.model.entryPoint.backend || plugin.path();
                this.logger.info(`Backend plug-in "${metadata.model.name}@${metadata.model.version}" from "${path} is now available"`);
            }
        }
    }
}

// Create inversify container
const inversifyContainer = new Container();

// bind logger to make it work
inversifyContainer.bind(ILogger).to(DummyTraceLogger).inSingletonScope();

// Bind Plug-in system
inversifyContainer.load(pluginExtBackendModule);

// Bind VsCode system
inversifyContainer.load(pluginVscodeBackendModule);

// override handler to our own class
inversifyContainer.rebind(PluginDeployerHandler).to(PluginDeployerHandlerImpl).inSingletonScope();

// bind local stuff
inversifyContainer.load(pluginRemoteBackendModule);

// remove endpoint
inversifyContainer.unbind(HostedPluginRemote);

// start the deployer
const pluginDeployer = inversifyContainer.get<PluginDeployer>(PluginDeployer);
pluginDeployer.start();

// display message about process being started
console.log(`Theia Endpoint ${process.pid}/pid listening on port`, PLUGIN_PORT);
