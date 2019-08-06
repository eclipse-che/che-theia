/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import 'reflect-metadata';
import * as http from 'http';
import * as ws from 'ws';
import { logger } from '@theia/core';
import { ILogger } from '@theia/core/lib/common';
import { Emitter } from '@theia/core/lib/common/event';
import { MAIN_RPC_CONTEXT, PluginDeployer, PluginDeployerEntry, PluginMetadata } from '@theia/plugin-ext';
import pluginVscodeBackendModule from '@theia/plugin-ext-vscode/lib/node/plugin-vscode-backend-module';
import { RPCProtocolImpl } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PluginDeployerHandler } from '@theia/plugin-ext/lib/common';
import { PluginHostRPC } from '@theia/plugin-ext/lib/hosted/node/plugin-host-rpc';
import { HostedPluginReader } from '@theia/plugin-ext/lib/hosted/node/plugin-reader';
import pluginExtBackendModule from '@theia/plugin-ext/lib/plugin-ext-backend-module';
import { Container, inject, injectable } from 'inversify';
import { DummyTraceLogger } from './dummy-trace-logger';
import pluginRemoteBackendModule from './plugin-remote-backend-module';
import { TerminalContainerAware } from './terminal-container-aware';
import { PluginDiscovery } from './plugin-discovery';

interface CheckAliveWS extends ws {
    alive: boolean;
}

@injectable()
export class PluginRemoteInit {

    // check alive
    private static readonly CHECK_ALIVE_TIMEOUT = 30000;

    /**
     * Max number of trying new port
     */
    private static readonly MAX_RETRIES = 100;

    /**
     *  number of retries for finding port
     */
    private retries: number = 0;

    /**
     * Instance of the server for websocket
     */
    private webSocketServer: ws.Server;

    /**
     * store session ID
     */
    private sessionId = 0;

    constructor(private pluginPort: number) {

    }

    async init(): Promise<void> {

        this.webSocketServer = await this.initWebSocket();
        this.initWebsocketServer();

        // Create inversify container
        const inversifyContainer = new Container();

        // bind logger to make it work
        inversifyContainer.bind(ILogger).to(DummyTraceLogger).inSingletonScope();

        // Bind Plug-in system
        inversifyContainer.load(pluginExtBackendModule);

        // Bind VsCode system
        inversifyContainer.load(pluginVscodeBackendModule);

        // override handler to our own class
        inversifyContainer.bind(PluginDeployerHandlerImpl).toSelf().inSingletonScope();
        inversifyContainer.rebind(PluginDeployerHandler).toService(PluginDeployerHandlerImpl);

        // bind local stuff
        inversifyContainer.load(pluginRemoteBackendModule);

        inversifyContainer.bind<number>('plugin.port').toConstantValue(this.pluginPort);

        // start the deployer
        const pluginDeployer = inversifyContainer.get<PluginDeployer>(PluginDeployer);
        pluginDeployer.start();

        // display message about process being started
        console.log(`Theia Endpoint ${process.pid}/pid listening on port`, this.pluginPort);
    }

    initWebsocketServer() {
        this.webSocketServer.on('connection', (socket: CheckAliveWS, request: http.IncomingMessage) => {
            socket.alive = true;
            socket.on('pong', () => socket.alive = true);
            this.handleConnection(socket, request);
        });
        setInterval(() => {
            this.webSocketServer.clients.forEach((socket: CheckAliveWS) => {
                if (socket.alive === false) {
                    return socket.terminate();
                }
                socket.alive = false;
                socket.ping();
            });
        }, PluginRemoteInit.CHECK_ALIVE_TIMEOUT);
    }

    async handlePortInUse(): Promise<ws.Server> {
        // increment pluginPort
        this.pluginPort++;

        if (this.retries > PluginRemoteInit.MAX_RETRIES) {
            throw new Error(`Try to find a free port but aborting after trying ${this.retries} unsuccessful times.`);
        }
        this.retries++;

        // retry
        return this.initWebSocket();
    }

    async initWebSocket(): Promise<ws.Server> {
        // start websocket server
        const websocketServer = new ws.Server({ port: this.pluginPort });

        return new Promise<ws.Server>((resolve, reject) => {
            // if port is already in use, try a new port of report the error
            // tslint:disable-next-line:no-any
            websocketServer.on('error', (error: any) => {
                // if port is specified, respect it and does not try to find a new free port.
                if (error.code === 'EADDRINUSE' && !process.env.THEIA_PLUGIN_ENDPOINT_PORT) {
                    try {
                        const portInUse = this.handlePortInUse();
                        resolve(portInUse);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`The port ${this.pluginPort} is already in used. \
Please specify another port or do not set THEIA_PLUGIN_ENDPOINT_PORT env var \
to pick-up automatically a free port`));
                }
            });

            // it is listening, resolve promise.
            websocketServer.on('listening', () => {
                resolve(websocketServer);
            });
        });
    }

    // create a new client on top of socket
    newClient(id: number, socket: ws): WebSocketClient {
        const emitter = new Emitter();
        const webSocketClient = new WebSocketClient(id, socket, emitter);
        webSocketClient.rpc = new RPCProtocolImpl({
            onMessage: emitter.event,
            // send messages to this client
            send: (m: {}) => {
                webSocketClient.send(m);
            }
        });

        const pluginHostRPC = new PluginHostRPC(webSocketClient.rpc);
        pluginHostRPC.initialize();
        webSocketClient.pluginHostRPC = pluginHostRPC;

        // override window.createTerminal to be container aware
        // tslint:disable-next-line:no-any
        new TerminalContainerAware().overrideTerminal((webSocketClient.rpc as any).locals[MAIN_RPC_CONTEXT.TERMINAL_EXT.id]);
        // tslint:disable-next-line:no-any
        new TerminalContainerAware().overrideTerminalCreationOptionForDebug((webSocketClient.rpc as any).locals[MAIN_RPC_CONTEXT.DEBUG_EXT.id]);

        return webSocketClient;
    }

    // Handle the connection received
    handleConnection(socket: ws, request: http.IncomingMessage): void {
        // create channel for discussing with this new client
        const channelId = this.sessionId++;
        const client = this.newClient(channelId, socket);
        webSocketClients.set(channelId, client);

        socket.on('error', err => {
        });

        socket.on('close', (code, reason) => {
            webSocketClients.delete(channelId);
        });

        socket.on('message', async (data: ws.Data) => {
            const jsonParsed = JSON.parse(data.toString());

            // handle local call
            if (jsonParsed.internal) {

                // asked to stop plug-ins
                if (jsonParsed.internal.method && jsonParsed.internal.method === 'stop') {
                    try {
                        // wait to stop plug-ins
                        await client.pluginHostRPC.stopContext();

                        // ok now we can dispose the emitter
                        client.disposeEmitter();
                    } catch (e) {
                        console.error(e);
                    }
                    return;
                }

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

            // send what is inside the message (wrapped message)
            client.fire(jsonParsed);

        });
    }
}

/**
 * Wrapper for adding Message ID on every message that is sent.
 */
class WebSocketClient {

    public rpc: RPCProtocolImpl;

    public pluginHostRPC: PluginHostRPC;

    // tslint:disable-next-line:no-any
    constructor(private readonly id: number, private socket: ws, private readonly emitter: Emitter<any>) {
    }

    public getIdentifier(): number {
        return this.id;
    }

    // message is a JSON entry
    // tslint:disable-next-line:no-any
    send(message: any) {
        try {
            this.socket.send(JSON.stringify(message));
        } catch (error) {
            console.log('error socket while sending', error, message);
        }
    }

    disposeEmitter(): void {
        this.emitter.dispose();
    }

    // tslint:disable-next-line:no-any
    fire(message: any) {
        try {
            this.emitter.fire(message);
        } catch (error) {
            console.log('error socket while sending', error, message);
        }
    }

}

// list of clients
const webSocketClients = new Map<number, WebSocketClient>();

const currentBackendPluginsMetadata: PluginMetadata[] = [];

@injectable()
class PluginDeployerHandlerImpl implements PluginDeployerHandler {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject('plugin.port')
    protected readonly pluginPort: number;

    // announced ?
    private announced = false;

    constructor(
        @inject(HostedPluginReader) private readonly reader: HostedPluginReader,
    ) {
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

        // ok now we're ready to announce as plugins have been deployed
        if (!this.announced) {
            const pluginDiscovery = new PluginDiscovery(this.logger, this.pluginPort);
            pluginDiscovery.discover();
            this.announced = true;
        }

    }
}
