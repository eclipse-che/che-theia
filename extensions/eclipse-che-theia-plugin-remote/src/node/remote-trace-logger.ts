/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { WebSocketClient } from './plugin-remote-init';
import { ConsoleLoggerServer } from '@theia/core/lib/node/console-logger-server';
import { Namespace, createNamespace } from 'cls-hooked';

const namespace: Namespace = createNamespace('remote-trace-log');

/**
 * Forward nodejs console output to listeners
 */
@injectable()
export class RemoteHostTraceLogger extends ConsoleLoggerServer {

    private callbacks: Map<number, LogCallback> = new Map();

    public addCallback(webSocketClient: WebSocketClient, callback: LogCallback) {
        this.callbacks.set(webSocketClient.getIdentifier(), callback);
    }

    public removeCallback(identifier: number) {
        this.callbacks.delete(identifier);
    }

    // tslint:disable-next-line:no-any
    async log(name: string, logLevel: number, message: string, params: any[]): Promise<void> {
        super.log(name, logLevel, message, params);
        const configuredLogLevel = await this.getLogLevel(name);
        if (logLevel >= configuredLogLevel) {
            if (!namespace.get('logging-active')) {
                const context = namespace.createContext();
                namespace.enter(context);
                namespace.set('logging-active', true);
                try {
                    const promises: Promise<void>[] = [];
                    this.callbacks.forEach(callback => promises.push(callback.log(name, logLevel, message, params)));
                    await Promise.all(promises);
                } finally {
                    namespace.exit(context);
                }
            }
        }
    }
}

export interface LogCallback {
    // tslint:disable-next-line:no-any
    log(name: string, logLevel: number, message: string, params: any[]): Promise<void>;
}
