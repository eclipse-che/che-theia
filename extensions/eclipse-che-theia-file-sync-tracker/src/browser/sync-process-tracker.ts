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

import { injectable, inject } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core/lib/common';
import { StatusBar, StatusBarAlignment, StatusBarEntry } from '@theia/core/lib/browser/status-bar/status-bar';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import URI from '@theia/core/lib/common/uri';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { DisposableCollection, Disposable } from '@theia/core';

@injectable()
export class SyncProcessTracker implements FrontendApplicationContribution {

    @inject(StatusBar)
    private statusBar: StatusBar;
    @inject(MessageService)
    protected readonly messageService: MessageService;
    @inject(CheApiService)
    protected cheApiService: CheApiService;
    private readonly ID = 'file-synchronization-indicator-id';
    protected readonly statusBarDisposable = new DisposableCollection();

    private readonly tooltip = 'File synchronization progress';
    private readonly fail = 'File Sync: Failed';
    private readonly done = 'File Sync: Done';

    async initialize(): Promise<void> {
        this.connect(await this.getSyncServiceURL());
    }

    async getSyncServiceURL(): Promise<string> {
        const server = await this.cheApiService.findUniqueServerByAttribute('type', 'rsync');
        if (server) {
            return new URI(server.url).resolve('track').toString();
        } else {
            return Promise.reject(new Error('Server rsync not found'));
        }
    }

    private connect(endpointAddress: string): void {
        const websocket = new ReconnectingWebSocket(endpointAddress, undefined, {
            maxRetries: Infinity,
        });
        websocket.onerror = err => {
            console.log(err);
            this.messageService.info('Can\'t establish connetion to rsync server. Cause:' + err);
        };
        websocket.onmessage = ev => {
            this.updateStatusBar(ev.data, websocket);
        };
        websocket.onclose = () => console.log('File synchronization tracking connection closed');
        websocket.onopen = () => console.log('File synchronization tracking connection opened');
    };

    private updateStatusBar(data: string, websocket: ReconnectingWebSocket): void {
        this.statusBarDisposable.dispose();
        const obj = JSON.parse(data);
        if (obj.state === 'DONE') {
            websocket.close();
            this.setStatusBarEntry({
                text: this.done,
                tooltip: this.tooltip,
                alignment: StatusBarAlignment.LEFT,
                onclick: (e: MouseEvent) => this.messageService.info(this.done),
                priority: 150
            });
            (async () => {
                await this.delay(5000); // hide message in 5 sec
                this.statusBarDisposable.dispose();
            })();
        } else if (obj.state === 'ERROR') {
            websocket.close();
            this.setStatusBarEntry({
                text: this.fail,
                tooltip: this.tooltip,
                alignment: StatusBarAlignment.LEFT,
                onclick: (e: MouseEvent) => this.messageService.error(obj.info),
                priority: 150
            });
        } else {
            const msg = `File Sync: ${obj.info}`;
            this.setStatusBarEntry({
                text: msg,
                tooltip: this.tooltip,
                alignment: StatusBarAlignment.LEFT,
                onclick: (e: MouseEvent) => this.messageService.info(msg),
                priority: 150
            });
        }
    }

    private setStatusBarEntry(entry: StatusBarEntry): void {
        this.statusBar.setElement(this.ID, entry);
        this.statusBarDisposable.push(Disposable.create(() => this.statusBar.removeElement(this.ID)));
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
