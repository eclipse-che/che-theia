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
import { applySegmentsToUri } from '../uri-helper';
import { MachineExecWatcher } from './machine-exec-watcher';
import * as startPoint from '../task-plugin-backend';

const ATTACH_TERMINAL_SEGMENT: string = 'attach';

export interface TerminalProcessOutputHandler {
    onMessage(content: string): void;
}

@injectable()
export class AttachTerminalClient {

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    @inject(MachineExecWatcher)
    protected readonly machineExecWatcher: MachineExecWatcher;

    async connectTerminalProcess(terminalId: number, outputHandler: TerminalProcessOutputHandler): Promise<void> {
        const termServerEndpoint = await this.cheWorkspaceClient.getMachineExecServerURL();

        const terminalURL = applySegmentsToUri(termServerEndpoint, ATTACH_TERMINAL_SEGMENT, `${terminalId}`);

        const webSocket = new ReconnectingWebSocket(terminalURL);

        webSocket.onMessage = (message: string) => {
            outputHandler.onMessage(message);
        };

        webSocket.onError = (error: Error) => {
            console.error('Websocket error:', error);
        };

        const disposable = this.machineExecWatcher.onExit(event => {
            if (event.id === terminalId) {
                webSocket.close();
                disposable.dispose();
            }
        });
        startPoint.getSubscriptions().push(disposable);
    }
}
