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
import { CheWorkspaceClient } from '../che-workspace-client';
import { ReconnectingWebSocket } from './websocket';
import { resolve } from 'url';

const ATTACH_TERMINAL_SEGMENT: string = 'attach';

export interface TerminalProcessOutputHandler {
    onMessage(content: string): void;
}

@injectable()
export class AttachTerminalClient {

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    async connectTerminalProcess(terminalId: number, outputHandler: TerminalProcessOutputHandler): Promise<void> {
        const termServerEndpoint = await this.cheWorkspaceClient.getMachineExecServerURL();

        const terminalURL = resolve(resolve(termServerEndpoint, ATTACH_TERMINAL_SEGMENT), `${terminalId}`);

        const webSocket = new ReconnectingWebSocket(terminalURL);

        webSocket.onMessage = (message: string) => {
            outputHandler.onMessage(message);
        };

        webSocket.onError = (error: Error) => {
            console.error('Websocket error:', error);
        };
        // TODO close webSocket when task is completed; event with runtime info is not implemented for plugin API at the moment
    }
}
