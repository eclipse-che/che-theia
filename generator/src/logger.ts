/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/**
 * Logger
 * @author Florent Benoit
 */
export class Logger {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static debug(...args: any): void {
        console.log.apply(console, args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static info(...args: any): void {
        console.info.apply(console, args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static error(...args: any): void {
        console.error.apply(console, args);
    }
}
