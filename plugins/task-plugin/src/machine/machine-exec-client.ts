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
import { injectable, inject, postConstruct } from 'inversify';
import { CheWorkspaceClient } from '../che-workspace-client';
import { createConnection } from './websocket';
import { applySegmentsToUri } from '../utils';
import { MachineExecWatcher } from './machine-exec-watcher';

const CREATE_METHOD_NAME: string = 'create';
const CONNECT_TERMINAL_SEGMENT: string = 'connect';

export interface MachineIdentifier {
    workspaceId: string,
    machineName: string
}

export interface MachineExec {
    identifier: MachineIdentifier,
    cmd: string[],
    cwd?: string,
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

    @inject(MachineExecWatcher)
    protected readonly machineExecWatcher!: MachineExecWatcher;

    @postConstruct()
    protected init(): void {
        this.getConnection();
    }

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

        let execServerUrl = applySegmentsToUri(machineExecServerEndpoint, CONNECT_TERMINAL_SEGMENT);

        const machineToken = process.env['CHE_MACHINE_TOKEN'];
        if (machineToken) {
            execServerUrl = `${execServerUrl}?token=${machineToken}`;
        }

        this.connection = await createConnection(execServerUrl);

        this.machineExecWatcher.init(this.connection);

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
}
