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
import { IWebSocket, ConsoleLogger, createWebSocketConnection, Logger, MessageConnection } from 'vscode-ws-jsonrpc';

const SS_CRT_PATH = '/tmp/che/secret/ca.crt';

/** Websocket wrapper allows to reconnect in case of failures */
export class ReconnectingWebSocket {

    /** Delay before trying to reconnect */
    private static RECONNECTION_DELAY: number = 1000;

    /** Instance of the websocket library. */
    private ws: WS;

    /** URL for connection */
    private readonly url: string;

    private readonly logger: Logger;

    constructor(url: string) {
        this.url = url;
        this.logger = new ConsoleLogger();
        this.open();
    }

    private getOptions(): WS.ClientOptions {
        let options: WS.ClientOptions = {};
        if (fs.existsSync(SS_CRT_PATH)) {
            const SS_SRT = fs.readFileSync(SS_CRT_PATH).toString();
            options = { ca: SS_SRT };
        }

        return options;
    }

    /** Open the websocket. If error, try to reconnect. */
    open() {
        this.ws = new WS(this.url, this.getOptions());

        this.ws.on('open', () => {
            this.onOpen(this.url);
        });

        this.ws.on('message', (data: WS.Data) => {
            this.onMessage(data);
        });

        this.ws.on('close', (code: number, reason: string) => {
            switch (code) {
                case 1000:
                    break;
                default:
                    this.reconnect(reason);
                    break;
            }
            this.onClose(code, reason);
        });

        // tslint:disable-next-line:no-any
        this.ws.on('error', (e: any) => {
            switch (e.code) {
                case 'ECONNREFUSED':
                    this.reconnect(e);
                    break;
                default:
                    this.onError(e);
                    break;
            }
        });
    }

    // tslint:disable-next-line:no-any
    public send(data: any) {
        try {
            this.ws.send(data);
        } catch (error) {
            this.ws.emit('error', error);
        }
    }

    public close() {
        this.ws.removeAllListeners();
        this.ws.close(1000);
    }

    private reconnect(reason: string) {
        this.logger.warn(`Task plugin webSocket: Reconnecting in ${ReconnectingWebSocket.RECONNECTION_DELAY}ms due to ${reason}`);
        this.ws.removeAllListeners();
        setTimeout(() => {
            this.logger.warn('Task plugin webSocket: Reconnecting...');
            this.open();
        }, ReconnectingWebSocket.RECONNECTION_DELAY);
    }

    public onOpen(url: string) { }
    public onClose(code: number, reason: string) { }
    public onMessage(data: WS.Data) { }
    public onError(reason: Error) { }
}

export function createConnection(url: string): Promise<MessageConnection> {
    const webSocket = new ReconnectingWebSocket(url);
    const logger = new ConsoleLogger();

    return new Promise<MessageConnection>((resolve, reject) => {
        webSocket.onOpen = () => {
            const messageConnection = createWebSocketConnection(toSocket(webSocket), logger);

            messageConnection.listen();
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
