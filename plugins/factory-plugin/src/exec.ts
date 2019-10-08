/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { spawn } from 'child_process';

export interface SpawnOptions {
    cwd: string;
}

export async function execute(commandLine: string, args?: string[], options?: SpawnOptions): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const command = spawn(commandLine, args, options);
        let result = '';
        let error = '';
        // tslint:disable-next-line:no-any
        command.stdout.on('data', (data: any) => {
            result += data.toString();
        });
        // tslint:disable-next-line:no-any
        command.stderr.on('data', (data: any) => {
            error += data.toString();
            console.error(`Child process ${commandLine} stderr: ${data}`);
        });
        command.on('close', (code: number | null) => {
            code = code === null ? 0 : code;
            const message = `Child process "${commandLine}" exited with code ${code}`;
            if (code === 0) {
                resolve(result.trim());
                console.log(message);
            } else {
                reject(new Error(error.length > 0 ? error : message));
                console.error(message);
            }
        });
    });
}
