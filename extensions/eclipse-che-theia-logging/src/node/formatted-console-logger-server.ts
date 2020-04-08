/********************************************************************************
 * Copyright (C) 2020 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ConsoleLoggerServer } from '@theia/core/lib/node/console-logger-server';
import { LogLevel } from '@theia/core';
import * as moment from 'moment';

export class FormattedConsoleLoggerServer extends ConsoleLoggerServer {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async log(name: string, logLevel: number, message: string, params: any[]): Promise<void> {
        const configuredLogLevel = await this.getLogLevel(name);
        if (logLevel >= configuredLogLevel) {
            process.stdout.write(`${this.getTimestamp()} ${name} ${this.getSeverity(logLevel)} ${message} ${this.getParams(params)}\n`);
        }
    }

    private getTimestamp(): string {
        // to have date like: 2020-03-02 17:24:47.197
        return moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    }

    private getSeverity(logLevel: number): string {
        return (LogLevel.strings.get(logLevel) || 'unknown').toUpperCase();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getParams(params: any[]): string {
        return params !== undefined && params.length > 0 ? `Params: ${params}` : '';
    }
}
