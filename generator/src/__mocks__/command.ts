/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

'use strict';

/**
 * Mock of the command class.
 */
export class Command {

    /**
     * Map between the name of the exec command and the output.
     */
    private static readonly execMap: Map<string, string> = new Map();

    // mock any exec command by providing the output
    public static __setExecCommandOutput(command: string, output: string): void {
        Command.execMap.set(command, output);
    }

    constructor() {

    }

    public async exec(command: string): Promise<string> {
        const result = Command.execMap.get(command);
        if (result) {
            return Promise.resolve(result);
        } else {
            return Promise.resolve('');
        }
    }

}
