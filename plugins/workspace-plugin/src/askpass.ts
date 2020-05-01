// tslint:disable:file-header
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Based on: https://github.com/Microsoft/vscode/blob/dd3e2d94f81139f9d18ba15a24c16c6061880b93/extensions/git/src/askpass.ts.

import * as theia from '@theia/plugin';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';

const randomBytes = denodeify<Buffer>(crypto.randomBytes);

export interface AskpassEnvironment {
    GIT_ASKPASS: string;
    ELECTRON_RUN_AS_NODE?: string;
    CHE_THEIA_GIT_ASKPASS_NODE?: string;
    CHE_THEIA_GIT_ASKPASS_MAIN?: string;
    CHE_THEIA_GIT_ASKPASS_HANDLE?: string;
}

function getIPCHandlePath(nonce: string): string {
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\che-theia-git-askpass-${nonce}-sock`;
    }

    if (process.env['XDG_RUNTIME_DIR']) {
        return path.join(process.env['XDG_RUNTIME_DIR'] as string, `che-theia-git-askpass-${nonce}.sock`);
    }

    return path.join(os.tmpdir(), `che-theia-git-askpass-${nonce}.sock`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let askpassEnv: any;

export async function initAskpassEnv(): Promise<void> {
    askpassEnv = await new Askpass().getEnv();
}

export class Askpass implements theia.Disposable {

    private server: http.Server;
    private ipcHandlePathPromise: Promise<string>;
    private ipcHandlePath: string | undefined;
    private enabled = true;

    constructor() {
        this.server = http.createServer((req, res) => this.onRequest(req, res));
        this.ipcHandlePathPromise = this.setup().catch(err => {
            console.error(err);
            return '';
        });
    }

    private async setup(): Promise<string> {
        const buffer = await randomBytes(20);
        const nonce = buffer.toString('hex');
        const ipcHandlePath = getIPCHandlePath(nonce);
        this.ipcHandlePath = ipcHandlePath;

        try {
            this.server.listen(ipcHandlePath);
            this.server.on('error', err => console.error(err));
        } catch (err) {
            console.error('Could not launch git askpass helper.');
            this.enabled = false;
        }

        return ipcHandlePath;
    }

    private onRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const chunks: string[] = [];
        req.setEncoding('utf8');
        req.on('data', (d: string) => chunks.push(d));
        req.on('end', () => {
            const { request, host } = JSON.parse(chunks.join(''));

            this.prompt(host, request).then(result => {
                res.writeHead(200);
                res.end(JSON.stringify(result));
            }, () => {
                res.writeHead(500);
                res.end();
            });
        });
    }

    private async prompt(host: string, request: string): Promise<string> {
        const options: theia.InputBoxOptions = {
            password: /password/i.test(request),
            placeHolder: request,
            prompt: `Git: ${host}`,
            ignoreFocusOut: true
        };

        return await theia.window.showInputBox(options) || '';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getEnv(): Promise<any> {
        if (!this.enabled) {
            return {
                GIT_ASKPASS: path.join(__dirname, 'askpass-empty.sh')
            };
        }

        return {
            ELECTRON_RUN_AS_NODE: '1',
            GIT_ASKPASS: path.join(__dirname, '../', 'src', 'askpass.sh'),
            CHE_THEIA_GIT_ASKPASS_NODE: process.execPath,
            CHE_THEIA_GIT_ASKPASS_MAIN: path.join(__dirname, 'askpass-main.js'),
            CHE_THEIA_GIT_ASKPASS_HANDLE: await this.ipcHandlePathPromise
        };
    }

    dispose(): void {
        this.server.close();

        if (this.ipcHandlePath && process.platform !== 'win32') {
            fs.unlinkSync(this.ipcHandlePath);
        }
    }
}

export function denodeify<A, B, C, R>(fn: Function): (a: A, b: B, c: C) => Promise<R>;
export function denodeify<A, B, R>(fn: Function): (a: A, b: B) => Promise<R>;
export function denodeify<A, R>(fn: Function): (a: A) => Promise<R>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function denodeify<R>(fn: Function): (...args: any[]) => Promise<R>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function denodeify<R>(fn: Function): (...args: any[]) => Promise<R> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args) => new Promise<R>((c, e) => fn(...args, (err: any, r: any) => err ? e(err) : c(r)));
}
