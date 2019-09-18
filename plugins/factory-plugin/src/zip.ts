/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

export async function execZip(folder: string, zipfile: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const unzip = spawn('unzip', ['-q', '-n', '-d', folder, zipfile]);
        unzip.on('close', (code: number) => {
            code = code === null ? 0 : code;
            const message = `Child process 'unzip' exited with code ${code}`;
            if (!code) {
                resolve();
            } else {
                reject(new Error(message));
                console.error(message);
            }
        });
        unzip.stderr.on('error', (data: any) => {
            console.error(`Child process 'unzip' stderr: ${data}`);
        });
    }).then(() => {
        new Promise((resolve, reject) => {
            const rm = spawn('rm', [zipfile]);
            rm.on('close', (code: number) => {
                code = code === null ? 0 : code;
                const message = `Child process 'rm' exited with code ${code}`;
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(message));
                    console.error(message);
                }
            });
            rm.stderr.on('error', (data: any) => {
                console.error(`Child process 'rm' stderr: ${data}`);
            });
        });
    });
}

export async function execWget(locationURI: string, folder: string, zipfile: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.mkdirSync(folder, { recursive: true });
        const zipfilePath = path.join(folder, zipfile);
        const wget = spawn('wget', [locationURI, '-O', zipfilePath]);
        wget.on('close', (code: number) => {
            code = code === null ? 0 : code;
            const message = `Child process 'wget' exited with code ${code}`;
            if (code === 0) {
                resolve(zipfilePath);
            } else {
                reject(new Error(message));
                console.error(message);
            }
        });
        wget.stderr.on('error', (data: any) => {
            console.error(`Child process 'wget' stderr: ${data}`);
        });
    });
}
