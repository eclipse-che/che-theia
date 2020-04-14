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
import { injectable } from 'inversify';
import * as theia from '@theia/plugin';

const EXIT_METHOD_NAME: string = 'onExecExit';
const ERROR_METHOD_NAME: string = 'onExecError';

const EXIT_CODE_PATTERN = /exit code (\d+)/;
const SUCCESS_EXIT_CODE = 0;
const GENERAL_ERROR_EXIT_CODE = 1;

interface ExecExitEvent {
    id: number;
    code: number;
}

interface ExecErrorEvent {
    id: number;
    stack: string;
}

@injectable()
export class MachineExecWatcher {
    readonly exitEmitter: theia.EventEmitter<ExecExitEvent>;

    constructor() {
        this.exitEmitter = new theia.EventEmitter<ExecExitEvent>();
    }

    init(connection: rpc.MessageConnection): void {

        const exitNotification = new rpc.NotificationType<ExecExitEvent, void>(EXIT_METHOD_NAME);
        connection.onNotification(exitNotification, (event: ExecExitEvent) => {
            this.exitEmitter.fire({ id: event.id, code: SUCCESS_EXIT_CODE });
        });

        const errorNotification = new rpc.NotificationType<ExecErrorEvent, void>(ERROR_METHOD_NAME);
        connection.onNotification(errorNotification, (event: ExecErrorEvent) => {
            this.exitEmitter.fire({ id: event.id, code: this.toErrorCode(event) });
        });
    }

    get onExit(): theia.Event<ExecExitEvent> {
        return this.exitEmitter.event;
    }

    private toErrorCode(event: ExecErrorEvent): number {
        const stack = event.stack;
        if (!stack) {
            return GENERAL_ERROR_EXIT_CODE;
        }

        const matches = stack.match(EXIT_CODE_PATTERN);
        if (matches && matches[1]) {
            return parseInt(matches[1]);
        }

        return GENERAL_ERROR_EXIT_CODE;
    }
}
