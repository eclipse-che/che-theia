/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Disposable, DisposableCollection } from '@theia/core';
import { StatusBar, StatusBarAlignment, StatusBarEntry } from '@theia/core/lib/browser/status-bar/status-bar';
import { inject, injectable } from 'inversify';

import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core/lib/common';
import ReconnectingWebSocket from 'reconnecting-websocket';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

@injectable()
export class SyncProcessTracker implements FrontendApplicationContribution {
  @inject(StatusBar)
  private statusBar: StatusBar;
  @inject(MessageService)
  protected readonly messageService: MessageService;
  @inject(WorkspaceService)
  protected workspaceService: WorkspaceService;
  private readonly ID = 'file-synchronization-indicator-id';
  protected readonly statusBarDisposable = new DisposableCollection();

  private readonly tooltip = 'File synchronization progress';
  private readonly fail = 'File Sync: Failed';
  private readonly done = 'File Sync: Done';

  async initialize(): Promise<void> {
    this.connect(await this.getSyncServiceURL());
  }

  async getSyncServiceURL(): Promise<string> {
    const server = await this.workspaceService.findUniqueEndpointByAttribute('type', 'rsync');
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
      this.messageService.info("Can't establish connetion to rsync server. Cause:" + err);
    };
    websocket.onmessage = ev => {
      this.updateStatusBar(ev.data, websocket);
    };
    websocket.onclose = () => console.log('File synchronization tracking connection closed');
    websocket.onopen = () => console.log('File synchronization tracking connection opened');
  }

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
        priority: 150,
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
        priority: 150,
      });
    } else {
      const msg = `File Sync: ${obj.info}`;
      this.setStatusBarEntry({
        text: msg,
        tooltip: this.tooltip,
        alignment: StatusBarAlignment.LEFT,
        onclick: (e: MouseEvent) => this.messageService.info(msg),
        priority: 150,
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
