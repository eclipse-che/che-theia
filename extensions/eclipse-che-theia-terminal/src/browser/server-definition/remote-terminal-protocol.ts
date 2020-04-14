/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { JsonRpcProxy } from '@theia/core';
import { Emitter, Event } from '@theia/core/lib/common/event';

export const TERMINAL_SERVER_TYPE = 'terminal';
export const CONNECT_TERMINAL_SEGMENT = 'connect';
export const ATTACH_TERMINAL_SEGMENT = 'attach';

export interface MachineIdentifier {
    machineName: string,
    workspaceId: string
}

export interface MachineExec {
    identifier: MachineIdentifier,
    cmd: string[],
    tty: boolean,
    cols: number,
    rows: number,
    id?: number
}

export interface IdParam {
    id: number
}

export interface ResizeParam extends IdParam {
    rows: number,
    cols: number
}

export const RemoteTerminalServer = Symbol('RemoteTerminalServer');
export interface RemoteTerminalServer {
    create(machineExec: MachineExec): Promise<number>;
    check(id: IdParam): Promise<number>;
    resize(resizeParam: ResizeParam): Promise<void>;
}

export const RemoteTerminalServerProxy = Symbol('RemoteTerminalServerProxy');
export type RemoteTerminalServerProxy = JsonRpcProxy<RemoteTerminalServer>;

// Terminal exec exit event
export class ExecExitEvent {
    id: number;
}

// Terminal exec error event
export class ExecErrorEvent {
    id: number;
    stack: string;
}

// Terminal exec client
export interface TerminalExecClient {
    onExecExit(event: ExecExitEvent): void;
    onExecError(event: ExecErrorEvent): void;
}

@injectable()
export class RemoteTerminalWatcher {

    private onRemoteTerminalExitEmitter = new Emitter<ExecExitEvent>();
    private onRemoteTerminalErrorEmitter = new Emitter<ExecErrorEvent>();

    getTerminalExecClient(): TerminalExecClient {

        const exitEmitter = this.onRemoteTerminalExitEmitter;
        const errorEmitter = this.onRemoteTerminalErrorEmitter;

        return {
            onExecExit(event: ExecExitEvent): void {
                exitEmitter.fire(event);
            },
            onExecError(event: ExecErrorEvent): void {
                errorEmitter.fire(event);
            }
        };
    }

    get onTerminalExecExit(): Event<ExecExitEvent> {
        return this.onRemoteTerminalExitEmitter.event;
    }

    get onTerminalExecError(): Event<ExecErrorEvent> {
        return this.onRemoteTerminalErrorEmitter.event;
    }
}
