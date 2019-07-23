/* tslint:disable */
/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
// Copied from 'terminal-widget.ts' with some modifications, CQ: https://dev.eclipse.org/ipzilla/show_bug.cgi?id=16269
/* tslint:enable */

import { injectable, inject, postConstruct } from 'inversify';
import { TerminalWidgetImpl } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { IBaseTerminalServer } from '@theia/terminal/lib/common/base-terminal-protocol';
import { TerminalProxyCreator, TerminalProxyCreatorProvider } from '../server-definition/terminal-proxy-creator';
import { ATTACH_TERMINAL_SEGMENT, RemoteTerminalServerProxy, RemoteTerminalWatcher } from '../server-definition/remote-terminal-protocol';
import { RemoteWebSocketConnectionProvider } from '../server-definition/remote-connection';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { Disposable } from 'vscode-jsonrpc';
import { TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';
import URI from '@theia/core/lib/common/uri';

const ReconnectingWebSocket = require('reconnecting-websocket');
export const REMOTE_TERMINAL_TARGET_SCOPE = 'remote-terminal';
export const REMOTE_TERMINAL_WIDGET_FACTORY_ID = 'remote-terminal';
export const RemoteTerminalWidgetOptions = Symbol('RemoteTerminalWidgetOptions');
export interface RemoteTerminalWidgetOptions extends Partial<TerminalWidgetOptions> {
    machineName: string,
    workspaceId: string,
    closeWidgetOnExitOrError: boolean,
    endpoint: string
}

export interface RemoteTerminalWidgetFactoryOptions extends Partial<TerminalWidgetOptions> {
    /* a unique string per terminal */
    created: string
}

@injectable()
export class RemoteTerminalWidget extends TerminalWidgetImpl {

    protected termServer: RemoteTerminalServerProxy | undefined;
    protected waitForRemoteConnection: Deferred<WebSocket> | undefined = new Deferred<WebSocket>();

    @inject('TerminalProxyCreatorProvider')
    protected readonly termProxyCreatorProvider: TerminalProxyCreatorProvider;
    @inject(RemoteWebSocketConnectionProvider)
    protected readonly remoteWebSocketConnectionProvider: RemoteWebSocketConnectionProvider;

    @inject(RemoteTerminalWatcher)
    protected readonly remoteTerminalWatcher: RemoteTerminalWatcher;

    @inject(RemoteTerminalWidgetOptions)
    options: RemoteTerminalWidgetOptions;

    protected terminalId = -1;
    private isOpen: boolean = false;

    @postConstruct()
    protected init(): void {
        super.init();

        this.toDispose.push(this.remoteTerminalWatcher.onTerminalExecExit(exitEvent => {
            if (this.terminalId === exitEvent.id) {
                if (this.options.closeWidgetOnExitOrError) {
                    this.dispose();
                }
                this.onTermDidClose.fire(this);
                this.onTermDidClose.dispose();
            }
        }));

        this.toDispose.push(this.remoteTerminalWatcher.onTerminalExecError(errEvent => {
            if (this.terminalId === errEvent.id) {
                if (this.options.closeWidgetOnExitOrError) {
                    this.dispose();
                }
                this.onTermDidClose.fire(this);
                this.onTermDidClose.dispose();
                this.logger.error(`Terminal error: ${errEvent.stack}`);
            }
        }));
    }

    async start(id?: number): Promise<number> {
        try {
            if (!this.termServer) {
                const termProxyCreator = <TerminalProxyCreator>await this.termProxyCreatorProvider();
                this.termServer = termProxyCreator.create();

                this.toDispose.push(this.termServer.onDidCloseConnection(() => {
                    const disposable = this.termServer.onDidOpenConnection(async () => {
                        disposable.dispose();
                        this.waitForRemoteConnection = new Deferred<WebSocket>();
                        await this.reconnectTerminalProcess();
                    });
                    this.toDispose.push(disposable);
                }));
            }
        } catch (err) {
            throw new Error('Failed to create terminal server proxy. Cause: ' + err);
        }
        this.terminalId = typeof id !== 'number' ? await this.createTerminal() : await this.attachTerminal(id);
        this.connectTerminalProcess();

        await this.waitForRemoteConnection;
        // Some delay need to attach exec. If we send resize earlier this size will be skipped.
        setTimeout(async () => {
            await this.resizeTerminalProcess();
        }, 100);

        if (IBaseTerminalServer.validateId(this.terminalId)) {
            this.onDidOpenEmitter.fire(undefined);
            return this.terminalId;
        }
        throw new Error('Failed to start terminal' + (id ? ` for id: ${id}.` : '.'));
    }

    protected async connectTerminalProcess(): Promise<void> {
        if (typeof this.terminalId !== 'number') {
            return;
        }
        this.toDisposeOnConnect.dispose();
        await this.connectSocket(this.terminalId);
    }

    get processId(): Promise<number> {
        return (async () => {
            if (!IBaseTerminalServer.validateId(this.terminalId)) {
                throw new Error('terminal is not started');
            }
            // Exec server side unable to return real process pid. This information is encapsulated.
            return this.terminalId;
        })();
    }

    protected async connectSocket(id: number): Promise<void> {
        if (this.isOpen) {
            return Promise.resolve();
        }
        const socket = this.createWebSocket(id.toString());

        const sendListener = data => socket.send(data);

        socket.onopen = () => {
            this.term.reset();
            if (this.waitForRemoteConnection) {
                this.waitForRemoteConnection.resolve(socket);
            }

            this.term.on('data', sendListener);
            socket.onmessage = ev => this.write(ev.data);

            this.toDispose.push(Disposable.create(() => {
                socket.close();
                this.term.off('data', sendListener);
            }));

            this.isOpen = true;
            return Promise.resolve();
        };

        socket.onerror = err => {
            this.term.off('data', sendListener);
            return Promise.resolve();
        };

        socket.onclose = code => {
            this.term.off('data', sendListener);
            return Promise.resolve();
        };
    }

    protected createWebSocket(pid: string): WebSocket {
        const url = new URI(this.options.endpoint).resolve(ATTACH_TERMINAL_SEGMENT).resolve(this.terminalId + '');
        return new ReconnectingWebSocket(url.toString(true), undefined, {
            maxReconnectionDelay: 10000,
            minReconnectionDelay: 1000,
            reconnectionDelayGrowFactor: 1.3,
            connectionTimeout: 10000,
            maxRetries: Infinity,
            debug: false
        });
    }

    protected async attachTerminal(id: number): Promise<number | undefined> {
        const termId = await this.termServer.check({ id: id });
        if (IBaseTerminalServer.validateId(termId)) {
            return termId;
        }
        this.logger.error(`Error attaching to terminal id ${id}`);
    }

    protected async createTerminal(): Promise<number | undefined> {
        const cols = this.term.cols;
        const rows = this.term.rows;
        let cmd: string[] = [];
        if (this.options.shellPath) {
            cmd = [this.options.shellPath, ...(this.options.shellArgs || [])];
        }

        const machineExec = {
            identifier: {
                machineName: this.options.machineName,
                workspaceId: this.options.workspaceId
            },
            cmd: cmd,
            cwd: this.options.cwd,
            cols,
            rows,
            tty: true,
        };

        const termId = await this.termServer.create(machineExec);
        if (IBaseTerminalServer.validateId(termId)) {
            return termId;
        }
        throw new Error('Error creating terminal widget');
    }

    protected resizeTerminalProcess(): void {
        if (typeof this.terminalId !== 'number') {
            return;
        }

        const cols = this.term.cols;
        const rows = this.term.rows;

        if (this.termServer) {
            this.termServer.resize({ id: this.terminalId, cols, rows });
        }
    }

    sendText(text: string): void {
        if (this.waitForRemoteConnection) {
            this.waitForRemoteConnection.promise.then(socket => socket.send(text));
        }
    }

}
