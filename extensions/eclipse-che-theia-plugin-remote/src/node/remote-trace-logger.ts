/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ILogger } from '@theia/core/lib/common';
import { Loggable } from '@theia/core';
import { injectable } from 'inversify';
import { WebSocketClient } from './plugin-remote-init';

/**
 * Trace logger used to provide a logger with inversify.
 * It also provides a way to add callbacks
 */
@injectable()
export class RemoteHostTraceLogger implements ILogger {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalConsoleLog: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalConsoleWarn: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalConsoleError: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalConsoleInfo: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalConsoleTrace: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private originalConsoleDebug: any;

    constructor() {
        this.originalConsoleLog = console.log;
        this.originalConsoleWarn = console.warn;
        this.originalConsoleError = console.error;
        this.originalConsoleInfo = console.info;
        this.originalConsoleTrace = console.trace;
        this.originalConsoleDebug = console.debug;
    }

    init(): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log = (message: any, ...args: any[]) => {
            this.doLog(message, ...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.warn = (message: any, ...args: any[]) => {
            this.warn(message, ...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error = (message: any, ...args: any[]) => {
            this.error(message, ...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.info = (message: any, ...args: any[]) => {
            this.info(message, ...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.trace = (message: any, ...args: any[]) => {
            this.trace(message, ...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.debug = (message: any, ...args: any[]) => {
            this.debug(message, ...args);
        };
    }

    async log(logLevel: number, loggable: Loggable): Promise<void> {
        // do nothing
    }

    async setLogLevel(logLevel: number): Promise<void> {

    }
    async getLogLevel(): Promise<number> {
        return 0;
    }
    async isEnabled(logLevel: number): Promise<boolean> {
        return true;
    }
    async ifEnabled(logLevel: number): Promise<void> {
    }
    async isTrace(): Promise<boolean> {
        return true;
    }
    async ifTrace(): Promise<void> {
    }
    async isDebug(): Promise<boolean> {
        return true;
    }
    async ifDebug(): Promise<void> {
    }
    async isInfo(): Promise<boolean> {
        return true;
    }
    async ifInfo(): Promise<void> {
    }
    async isWarn(): Promise<boolean> {
        return true;
    }
    async ifWarn(): Promise<void> {
    }
    async isError(): Promise<boolean> {
        return true;
    }
    async ifError(): Promise<void> {
    }
    async isFatal(): Promise<boolean> {
        return true;
    }
    async ifFatal(): Promise<void> {
    }
    child(name: string): ILogger {
        return this;
    }

    private callbacks: Map<number, LogCallback> = new Map();

    public addCallback(webSocketClient: WebSocketClient, callback: LogCallback): void {
        this.callbacks.set(webSocketClient.getIdentifier(), callback);
    }

    public removeCallback(identifier: number): void {
        this.callbacks.delete(identifier);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async trace(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.trace(message, ...params));
        this.originalConsoleTrace.trace(message, ...params);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async debug(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.debug(message, ...params));
        this.originalConsoleDebug(message, ...params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async doLog(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.log(message, ...params));
        this.originalConsoleLog(message, ...params);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async info(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.info(message, ...params));
        this.originalConsoleInfo(message, ...params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async warn(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.warn(message, ...params));
        this.originalConsoleWarn(message, ...params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async error(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.error(message, ...params));
        this.originalConsoleError(message, ...params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async fatal(message: any, ...params: any[]): Promise<void> {
        this.callbacks.forEach(callback => callback.fatal(message, ...params));
        this.originalConsoleError(message, ...params);
    }

}

export interface LogCallback {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(message: any, ...params: any[]): Promise<void>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace(message: any, ...params: any[]): Promise<void>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug(message: any, ...params: any[]): Promise<void>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info(message: any, ...params: any[]): Promise<void>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(message: any, ...params: any[]): Promise<void>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(message: any, ...params: any[]): Promise<void>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fatal(message: any, ...params: any[]): Promise<void>;
}
