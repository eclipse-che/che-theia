/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as WS from 'ws';
import * as fs from 'fs';
import * as tunnel from 'tunnel';
import * as url from 'url';
import * as http from 'http';
import * as https from 'https';
import { IWebSocket, ConsoleLogger, createWebSocketConnection, Logger, MessageConnection } from 'vscode-ws-jsonrpc';

const SS_CRT_PATH = '/tmp/che/secret/ca.crt';

/** Websocket wrapper allows to reconnect in case of failures */
export class ReconnectingWebSocket {

    /** Delay before trying to reconnect */
    private static RECONNECTION_DELAY: number = 1000;
    private static PING_INTERVAL: number = 30000;

    private reconnectionTimeout: NodeJS.Timeout | undefined;
    private pingIntervalID: NodeJS.Timeout | undefined;

    /** Instance of the websocket library. */
    private ws: WS;

    /** URL for connection */
    private readonly url: string;

    private readonly logger: Logger;

    constructor(targetUrl: string) {
        this.url = targetUrl;
        this.logger = new ConsoleLogger();
        this.open();
    }

    /** Open the websocket. If error, try to reconnect. */
    open(): void {
        this.ws = new WS(this.url, this.getOptions());

        this.ws.on('open', () => {
            this.onOpen(this.url);
            this.schedulePing();
        });

        this.ws.on('message', (data: WS.Data) => {
            this.onMessage(data);
        });

        this.ws.on('close', (code: number, reason: string) => {
            this.onDidConnectionLose();

            if (code !== 1000) {
                this.reconnect(reason);
            }
            this.onClose(code, reason);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ws.on('error', (e: any) => {
            this.onDidConnectionLose();

            if (e.code === 'ECONNREFUSED') {
                this.reconnect(e);
            } else {
                this.onError(e);
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public send(data: any): void {
        try {
            this.ws.send(data);
        } catch (error) {
            this.ws.emit('error', error);
        }
    }

    public close(): void {
        this.ws.removeAllListeners();
        this.onDidConnectionLose();

        this.ws.close(1000);
    }

    private getOptions(): WS.ClientOptions {
        let options: WS.ClientOptions = {};

        const certificateAuthority = this.getCertificateAuthority();
        const baseUrl = process.env.CHE_API;
        const proxyUrl = process.env.http_proxy;

        if (proxyUrl && proxyUrl !== '' && baseUrl) {
            const parsedBaseUrl = url.parse(baseUrl);
            if (parsedBaseUrl.hostname && this.shouldProxy(parsedBaseUrl.hostname)) {
                const parsedProxyUrl = url.parse(proxyUrl);
                const mainProxyOptions = this.getMainProxyOptions(parsedProxyUrl);

                const isHttpsProxy = parsedProxyUrl.protocol && parsedProxyUrl.protocol.startsWith('https:');
                const isHttpsUrl = parsedBaseUrl.protocol && parsedBaseUrl.protocol.startsWith('https:');

                if (isHttpsUrl) {
                    options.agent = isHttpsProxy ?
                        this.createHttpsOverHttpsAgent(mainProxyOptions, parsedBaseUrl.hostname, certificateAuthority) :
                        this.createHttpsOverHttpAgent(mainProxyOptions, certificateAuthority);
                } else {
                    options.agent = isHttpsProxy ?
                        this.createHttpOverHttpsAgent(mainProxyOptions, parsedBaseUrl.hostname, certificateAuthority) :
                        tunnel.httpOverHttp({ proxy: mainProxyOptions });
                }
                return options;
            }
        }

        if (certificateAuthority) {
            options = {
                agent: new https.Agent({
                    ca: certificateAuthority
                })
            };
        }

        return options;
    }

    private schedulePing(): void {
        this.pingIntervalID = setInterval(() => {
            this.ws.ping();
        }, ReconnectingWebSocket.PING_INTERVAL);
    }

    private reconnect(reason: string): void {
        this.ws.removeAllListeners();

        this.logger.warn(`Task plugin webSocket: Reconnecting in ${ReconnectingWebSocket.RECONNECTION_DELAY}ms due to ${reason}`);

        this.reconnectionTimeout = setTimeout(() => {
            this.logger.warn('Task plugin webSocket: Reconnecting...');
            this.open();
        }, ReconnectingWebSocket.RECONNECTION_DELAY);
    }

    private onDidConnectionLose(): void {
        if (this.reconnectionTimeout) {
            clearTimeout(this.reconnectionTimeout);
        }

        if (this.pingIntervalID) {
            clearInterval(this.pingIntervalID);
        }
    }

    private createHttpsOverHttpsAgent(mainProxyOptions: tunnel.ProxyOptions, servername: string | undefined, certificateAuthority: Buffer[] | undefined): http.Agent {
        const httpsProxyOptions = this.getHttpsProxyOptions(mainProxyOptions, servername, certificateAuthority);
        return tunnel.httpsOverHttps({
            proxy: httpsProxyOptions,
            ca: certificateAuthority
        });
    }

    private createHttpsOverHttpAgent(mainProxyOptions: tunnel.ProxyOptions, certificateAuthority: Buffer[] | undefined): http.Agent {
        return tunnel.httpsOverHttp({
            proxy: mainProxyOptions,
            ca: certificateAuthority
        });
    }

    private createHttpOverHttpsAgent(mainProxyOptions: tunnel.ProxyOptions, servername: string | undefined, certificateAuthority: Buffer[] | undefined): http.Agent {
        const httpsProxyOptions = this.getHttpsProxyOptions(mainProxyOptions, servername, certificateAuthority);
        return tunnel.httpOverHttps({ proxy: httpsProxyOptions });
    }

    private getCertificateAuthority(): Buffer[] | undefined {
        if (fs.existsSync(SS_CRT_PATH)) {
            return [fs.readFileSync(SS_CRT_PATH)];
        }
        return undefined;
    }

    private shouldProxy(hostname: string): boolean {
        const noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
        const noProxy: string[] = noProxyEnv ? noProxyEnv.split(',').map(s => s.trim()) : [];
        return !noProxy.some(rule => {
            if (!rule) {
                return false;
            }
            if (rule === '*') {
                return true;
            }
            if (rule[0] === '.' &&
                hostname.substr(hostname.length - rule.length) === rule) {
                return true;
            }
            return hostname === rule;
        });
    }

    private getMainProxyOptions(parsedProxyUrl: url.UrlWithStringQuery): tunnel.ProxyOptions {
        const port = Number(parsedProxyUrl.port);
        return {
            host: parsedProxyUrl.hostname!,
            port: (parsedProxyUrl.port !== '' && !isNaN(port)) ? port : 3128,
            proxyAuth: (parsedProxyUrl.auth && parsedProxyUrl.auth !== '') ? parsedProxyUrl.auth : undefined
        };
    }

    private getHttpsProxyOptions(mainProxyOptions: tunnel.ProxyOptions, servername: string | undefined, certificateAuthority: Buffer[] | undefined): tunnel.HttpsProxyOptions {
        return {
            host: mainProxyOptions.host,
            port: mainProxyOptions.port,
            proxyAuth: mainProxyOptions.proxyAuth,
            servername,
            ca: certificateAuthority
        };
    }

    public onOpen(targetUrl: string): void { }
    public onClose(code: number, reason: string): void { }
    public onMessage(data: WS.Data): void { }
    public onError(reason: Error): void { }
}

export function createConnection(targetUrl: string, openConnectionHandler?: (connection: MessageConnection) => void): Promise<MessageConnection> {
    const webSocket = new ReconnectingWebSocket(targetUrl);
    const logger = new ConsoleLogger();

    return new Promise<MessageConnection>((resolve, reject) => {
        webSocket.onOpen = () => {
            const messageConnection = createWebSocketConnection(toSocket(webSocket), logger);

            messageConnection.listen();

            if (openConnectionHandler) {
                openConnectionHandler(messageConnection);
            }
            resolve(messageConnection);
        };

        webSocket.onError = (error: Error) => {
            reject(error);
            logger.error('Unable to create ws connection for task plugin. Cause: ' + error);
            return;
        };
    });
}

export function toSocket(webSocket: ReconnectingWebSocket): IWebSocket {
    return {
        send: content => webSocket.send(content),
        onMessage: callback => webSocket.onMessage = data => callback(data),
        onError: callback => webSocket.onError = error => callback(error.message),
        onClose: callback => webSocket.onClose = (code: number, reason: string) => callback(code, reason),
        dispose: () => webSocket.close()
    };
}
