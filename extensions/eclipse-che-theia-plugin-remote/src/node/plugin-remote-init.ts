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
import * as theia from '@theia/plugin';
import * as ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '@theia/core';
import { ILogger } from '@theia/core/lib/common';
import { Emitter } from '@theia/core/lib/common/event';
import { MAIN_RPC_CONTEXT, PluginDeployer, PluginDeployerEntry, PluginDependencies } from '@theia/plugin-ext';
import { DeployedPlugin, PluginEntryPoint, PluginManagerStartParams, PluginInfo } from '@theia/plugin-ext';
import pluginVscodeBackendModule from '@theia/plugin-ext-vscode/lib/node/plugin-vscode-backend-module';
import { RPCProtocolImpl } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PluginDeployerHandler, OutputChannelRegistryExt } from '@theia/plugin-ext/lib/common';
import { PluginHostRPC } from '@theia/plugin-ext/lib/hosted/node/plugin-host-rpc';
import { HostedPluginReader } from '@theia/plugin-ext/lib/hosted/node/plugin-reader';
import pluginExtBackendModule from '@theia/plugin-ext/lib/plugin-ext-backend-module';
import { Container, inject, injectable } from 'inversify';
import { RemoteHostTraceLogger, LogCallback } from './remote-trace-logger';
import pluginRemoteBackendModule from './plugin-remote-backend-module';
import { TerminalContainerAware } from './terminal-container-aware';
import { PluginDiscovery } from './plugin-discovery';
import { PluginReaderExtension } from './plugin-reader-extension';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { DocumentContainerAware } from './document-container-aware';
import { LanguagesContainerAware } from './languages-container-aware';
import { PluginManagerExtImpl } from '@theia/plugin-ext/lib/plugin/plugin-manager';
import { ExecuteCommandContainerAware } from './execute-command-container-aware';

interface CheckAliveWS extends ws {
    alive: boolean;
}

function modifyPathToLocal(origPath: string): string {
    return path.join(os.homedir(), origPath.substr(0, '/home/theia/'.length));
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

    private pluginReaderExtension: PluginReaderExtension;
    private remoteTraceLogger: RemoteHostTraceLogger;

    constructor(private pluginPort: number) {

    }

    async init(): Promise<void> {

        this.webSocketServer = await this.initWebSocket();
        this.initWebsocketServer();

        // Create inversify container
        const inversifyContainer = new Container();

        this.remoteTraceLogger = new RemoteHostTraceLogger();

        // init the logger
        this.remoteTraceLogger.init();

        // bind logger to make it work
        inversifyContainer.bind(ILogger).toConstantValue(this.remoteTraceLogger);

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

        this.pluginReaderExtension = inversifyContainer.get(PluginReaderExtension);

        // Modify 'configStorage' objects path, to use current user home directory
        // in remote plugin image '/home/theia' doesn't exist
        const originalStart = PluginManagerExtImpl.prototype.$start;
        PluginManagerExtImpl.prototype.$start = async function (params: PluginManagerStartParams): Promise<void> {
            params.configStorage = { hostLogPath: modifyPathToLocal(params.configStorage.hostLogPath), hostStoragePath: modifyPathToLocal(params.configStorage.hostLogPath) };
            // call original method
            return originalStart.call(this, params);
        };

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
        // tslint:disable-next-line:no-any
        const emitter = new Emitter<any>();
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
        new TerminalContainerAware().overrideTerminal((webSocketClient.rpc as any).locals.get(MAIN_RPC_CONTEXT.TERMINAL_EXT.id));
        // tslint:disable-next-line:no-any
        new TerminalContainerAware().overrideTerminalCreationOptionForDebug((webSocketClient.rpc as any).locals.get(MAIN_RPC_CONTEXT.DEBUG_EXT.id));
        // tslint:disable-next-line:no-any
        DocumentContainerAware.makeDocumentContainerAware((webSocketClient.rpc as any).locals.get(MAIN_RPC_CONTEXT.DOCUMENTS_EXT.id));
        // tslint:disable-next-line:no-any
        LanguagesContainerAware.makeLanguagesContainerAware((webSocketClient.rpc as any).locals.get(MAIN_RPC_CONTEXT.LANGUAGES_EXT.id));
        // tslint:disable-next-line:no-any
        ExecuteCommandContainerAware.makeExecuteCommandContainerAware((webSocketClient.rpc as any).locals.get(MAIN_RPC_CONTEXT.COMMAND_REGISTRY_EXT.id));

        let channelName = '';
        if (process.env.CHE_MACHINE_NAME) {
            channelName = `Extension host (${process.env.CHE_MACHINE_NAME}) log`;
        } else {
            channelName = `Extension host (${this.pluginPort}) log`;
        }
        const pluginInfo: PluginInfo = { id: channelName, name: channelName };
        // tslint:disable-next-line: no-any
        const outputChannelRegistryExt: OutputChannelRegistryExt = (webSocketClient.rpc as any).locals.get(MAIN_RPC_CONTEXT.OUTPUT_CHANNEL_REGISTRY_EXT.id);
        const outputChannel = outputChannelRegistryExt.createOutputChannel(channelName, pluginInfo);
        const outputChannelLogCallback = new OutputChannelLogCallback(outputChannel);
        this.remoteTraceLogger.addCallback(webSocketClient, outputChannelLogCallback);

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
            this.remoteTraceLogger.removeCallback(channelId);
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
                        // FIXME: we need to fix this
                        // tslint:disable-next-line: no-any
                        await (<any>client.pluginHostRPC).pluginManager.$stop();

                        // ok now we can dispose the emitter
                        client.disposeEmitter();
                    } catch (e) {
                        console.error(e);
                    }
                    return;
                }

                // asked to send plugin resource
                if (jsonParsed.internal.method === 'getResource') {
                    const pluginId: string = jsonParsed.internal['pluginId'];
                    const resourcePath: string = jsonParsed.internal['path'];

                    const pluginRootDirectory = this.pluginReaderExtension.getPluginRootDirectory(pluginId);
                    const resourceFilePath = path.join(pluginRootDirectory!, resourcePath);

                    let resourceBase64: string | undefined;
                    if (fs.existsSync(resourceFilePath)) {
                        const resourceBinary = fs.readFileSync(resourceFilePath);
                        resourceBase64 = resourceBinary.toString('base64');
                    }

                    client.send({
                        'internal': {
                            'method': 'getResource',
                            'pluginId': pluginId,
                            'path': resourcePath,
                            'data': resourceBase64
                        }
                    });

                    return;
                }

                // asked to grab metadata, send them
                if (jsonParsed.internal.metadata && 'request' === jsonParsed.internal.metadata) {
                    // apply host on all local metadata
                    currentBackendDeployedPlugins.forEach(deployedPlugin => deployedPlugin.metadata.host = jsonParsed.internal.endpointName);
                    const metadataResult = {
                        'internal': {
                            'endpointName': jsonParsed.internal.endpointName,
                            'metadata': {
                                'result': currentBackendDeployedPlugins
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
export class WebSocketClient {

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

const currentBackendDeployedPlugins: DeployedPlugin[] = [];

@injectable()
class PluginDeployerHandlerImpl implements PluginDeployerHandler {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject('plugin.port')
    protected readonly pluginPort: number;

    // announced ?
    private announced = false;

    /**
     * Managed plugin metadata backend entries.
     */
    private readonly deployedBackendPlugins = new Map<string, DeployedPlugin>();

    @inject(HostedPluginReader)
    private readonly reader: HostedPluginReader;

    private backendPluginsMetadataDeferred = new Deferred<void>();

    async getDeployedFrontendPluginIds(): Promise<string[]> {
        return [];
    }

    async getDeployedBackendPluginIds(): Promise<string[]> {
        // await first deploy
        await this.backendPluginsMetadataDeferred.promise;
        // fetch the last deployed state
        return [...this.deployedBackendPlugins.keys()];
    }

    getDeployedPlugin(pluginId: string): DeployedPlugin | undefined {
        return this.deployedBackendPlugins.get(pluginId);
    }

    async deployFrontendPlugins(frontendPlugins: PluginDeployerEntry[]): Promise<void> {
        if (frontendPlugins.length > 0) {
            logger.error('Frontend plug-in cannot be deployed in sidecar container');
        }
    }

    async deployBackendPlugins(backendPlugins: PluginDeployerEntry[]): Promise<void> {
        for (const plugin of backendPlugins) {
            await this.deployPlugin(plugin, 'backend');
        }
        // resolve on first deploy
        this.backendPluginsMetadataDeferred.resolve(undefined);

        // ok now we're ready to announce as plugins have been deployed
        if (!this.announced) {
            const pluginDiscovery = new PluginDiscovery(this.logger, this.pluginPort);
            pluginDiscovery.discover();
            this.announced = true;
        }

    }
    async getPluginDependencies(pluginToBeInstalled: PluginDeployerEntry): Promise<PluginDependencies | undefined> {
        const pluginPath = pluginToBeInstalled.path();
        try {
            const manifest = await this.reader.readPackage(pluginPath);
            if (!manifest) {
                return undefined;
            }
            const metadata = this.reader.readMetadata(manifest);
            const dependencies: PluginDependencies = { metadata };
            dependencies.mapping = this.reader.readDependencies(manifest);
            return dependencies;
        } catch (e) {
            console.error(`Failed to load plugin dependencies from '${pluginPath}' path`, e);
            return undefined;
        }
    }

    /**
     * @throws never! in order to isolate plugin deployment
     */
    protected async deployPlugin(entry: PluginDeployerEntry, entryPoint: keyof PluginEntryPoint): Promise<void> {
        const pluginPath = entry.path();
        try {
            const manifest = await this.reader.readPackage(pluginPath);
            if (!manifest) {
                return;
            }

            const metadata = this.reader.readMetadata(manifest);
            if (this.deployedBackendPlugins.has(metadata.model.id)) {
                return;
            }

            const deployed: DeployedPlugin = { metadata };
            deployed.contributes = this.reader.readContribution(manifest);
            this.deployedBackendPlugins.set(metadata.model.id, deployed);
            currentBackendDeployedPlugins.push(deployed);
            this.logger.info(`Deploying ${entryPoint} plugin "${metadata.model.name}@${metadata.model.version}" from "${metadata.model.entryPoint[entryPoint] || pluginPath}"`);
        } catch (e) {
            console.error(`Failed to deploy ${entryPoint} plugin from '${pluginPath}' path`, e);
        }
    }

}

class OutputChannelLogCallback implements LogCallback {

    constructor(readonly outputChannel: theia.OutputChannel) {

    }
    // tslint:disable-next-line:no-any
    async log(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('LOG:' + message + params);
    }
    // tslint:disable-next-line:no-any
    async trace(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('TRACE:' + message + params);
    }
    // tslint:disable-next-line:no-any
    async debug(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('DEBUG:' + message + params);
    }
    // tslint:disable-next-line:no-any
    async info(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('INFO:' + message + params);
    }
    // tslint:disable-next-line:no-any
    async warn(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('WARN:' + message + params);
    }
    // tslint:disable-next-line:no-any
    async error(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('ERROR:' + message + params);
    }
    // tslint:disable-next-line:no-any
    async fatal(message: any, ...params: any[]): Promise<void> {
        this.outputChannel.appendLine('FATAL:' + message + params);
    }

}
