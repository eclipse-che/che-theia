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

/**
 * Dummty trace logger used to provide a logger with inversify.
 */
@injectable()
export class DummyTraceLogger implements ILogger {

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

    // tslint:disable-next-line:no-any
    async trace(message: any, ...params: any[]): Promise<void> {
        console.trace(message, ...params);
    }

    // tslint:disable-next-line:no-any
    async debug(message: any, ...params: any[]): Promise<void> {
        console.debug(message, ...params);
    }
    // tslint:disable-next-line:no-any
    async info(message: any, ...params: any[]): Promise<void> {
        console.info(message, ...params);
    }
    // tslint:disable-next-line:no-any
    async warn(message: any, ...params: any[]): Promise<void> {
        console.warn(message, ...params);
    }
    // tslint:disable-next-line:no-any
    async error(message: any, ...params: any[]): Promise<void> {
        console.error(message, ...params);
    }
    // tslint:disable-next-line:no-any
    async fatal(message: any, ...params: any[]): Promise<void> {
        console.error(message, ...params);
    }

}
