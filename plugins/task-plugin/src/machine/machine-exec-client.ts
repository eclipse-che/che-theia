/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as rpc from 'vscode-ws-jsonrpc';
import * as ws from 'ws';
import { injectable, inject } from 'inversify';
import { ConsoleLogger, createWebSocketConnection, IWebSocket } from 'vscode-ws-jsonrpc';
import { CheWorkspaceClient } from '../che-workspace-client';

const ReconnectingWebSocket = require('reconnecting-websocket');
const RECONNECTING_OPTIONS = {
    constructor: ws,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 10000,
    maxRetries: Infinity,
    debug: false
};

const CREATE_METHOD_NAME: string = 'create';
const CONNECT_TERMINAL_SEGMENT: string = 'connect';

export interface MachineIdentifier {
    workspaceId: string,
    machineName: string
}
export interface MachineExec {
    identifier: MachineIdentifier,
    cmd: string[],
    tty: boolean,
    id?: number
}

export interface TerminalProcessOutputHandler {
    onMessage(content: string): void;
}

@injectable()
export class MachineExecClient {

    private machineExecServerEndpoint: string | undefined = undefined;
    private connection: rpc.MessageConnection | undefined = undefined;

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    async getExecId(machineExec: MachineExec): Promise<number> {
        const connection = await this.getConnection();
        const request = new rpc.RequestType<MachineExec, number, void, void>(CREATE_METHOD_NAME);
        return await connection.sendRequest(request, machineExec);
    }

    private async getConnection(): Promise<rpc.MessageConnection> {
        if (this.connection) {
            return this.connection;
        }

        const machineExecServerEndpoint = await this.fetchMachineExecServerURL();
        if (machineExecServerEndpoint === undefined) {
            throw new Error('URL for machine-exec server is not found in the current workspace.');
        }

        const execServerUrl: string = `${machineExecServerEndpoint}/${CONNECT_TERMINAL_SEGMENT}`;
        this.connection = await this.createConnection(execServerUrl);
        return this.connection;
    }

    private async fetchMachineExecServerURL(): Promise<string> {
        if (this.machineExecServerEndpoint === undefined) {
            const url = await this.cheWorkspaceClient.getMachineExecServerURL();
            this.machineExecServerEndpoint = url;
            return url;
        }
        return this.machineExecServerEndpoint;
    }

    private async createConnection(execServerUrl: string): Promise<rpc.MessageConnection> {
        const webSocket = new ReconnectingWebSocket(execServerUrl, undefined, RECONNECTING_OPTIONS);
        const logger = new ConsoleLogger();

        return new Promise<rpc.MessageConnection>((resolve, reject) => {
            webSocket.addEventListener('open', () => {
                const vsCodeWebSocket = this.createVsCodeWebSocket(webSocket);
                const messageConnection = createWebSocketConnection(vsCodeWebSocket, logger);

                messageConnection.listen();
                resolve(messageConnection);
            });
            webSocket.onerror = function (error: Event) {
                reject(error);
                logger.error('' + error);
                return;
            };
        });
    }

    protected createVsCodeWebSocket(webSocket: WebSocket): IWebSocket {
        return {
            send: msg => webSocket.send(msg),
            onMessage: cb => webSocket.addEventListener('message', event => cb(event.data)),
            onError: cb => webSocket.onerror = event => {
                if ('message' in event) {
                    // tslint:disable-next-line:no-any
                    cb((event as any).message);
                }
            },
            onClose: cb => webSocket.onclose = event => cb(event.code, event.reason),
            dispose: () => webSocket.close()
        };
    }
}
