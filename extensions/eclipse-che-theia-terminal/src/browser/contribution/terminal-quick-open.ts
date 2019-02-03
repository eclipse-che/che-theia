/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { QuickOpenService, QuickOpenModel, QuickOpenItem } from '@theia/core/lib/browser/quick-open/';
import { QuickOpenMode, QuickOpenOptions, WidgetManager, ApplicationShell } from '@theia/core/lib/browser';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions } from '../terminal-widget/remote-terminal-widget';
import {CHEWorkspaceService} from '../../common/workspace-service';
import {TerminalApiEndPointProvider} from '../server-definition/terminal-proxy-creator';
import {TerminalWidget, TerminalWidgetOptions} from '@theia/terminal/lib/browser/base/terminal-widget';
import { RemoteTerminalWidget } from '../terminal-widget/remote-terminal-widget';
import { OpenTerminalHandler } from './exec-terminal-contribution';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class TerminalQuickOpenService {

    constructor(
        @inject(QuickOpenService) private readonly quickOpenService: QuickOpenService,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
        @inject(EnvVariablesServer) protected readonly baseEnvVariablesServer: EnvVariablesServer,
        @inject('TerminalApiEndPointProvider') protected readonly termApiEndPointProvider: TerminalApiEndPointProvider,
        @inject(CHEWorkspaceService) protected readonly workspaceService: CHEWorkspaceService,
        @inject(ApplicationShell) protected readonly shell: ApplicationShell
    ) {
    }

     public async newTerminalPerContainer(containerName: string, options?: TerminalWidgetOptions): Promise<TerminalWidget> {
        try {
            const workspaceId = <string>await this.baseEnvVariablesServer.getValue('CHE_WORKSPACE_ID').then(v => v ? v.value : undefined);
            const termApiEndPoint = <URI | undefined>await this.termApiEndPointProvider();

            const widget = <RemoteTerminalWidget>await this.widgetManager.getOrCreateWidget(REMOTE_TERMINAL_WIDGET_FACTORY_ID, <RemoteTerminalWidgetFactoryOptions>{
                created: new Date().toString(),
                machineName: containerName,
                workspaceId: workspaceId,
                endpoint: termApiEndPoint.toString(true),
                ...options
            });
            return widget;
        } catch (err) {
            console.error('Failed to create terminal widget. Cause: ', err);
        }
        throw new Error('Unable to create new terminal for machine: ' + containerName);
    }

    async displayListMachines(doOpen: OpenTerminalHandler) {
        const items: QuickOpenItem[] = [];
        const machines = await this.workspaceService.getMachineList();

        if (machines) {
            for (const machineName in machines) {
                if (!machines.hasOwnProperty(machineName)) {
                    continue;
                }
                items.push(new NewTerminalItem(machineName, async (newTermItemFunc) => {
                    doOpen(newTermItemFunc.machineName);
                }));
            }
        }

        this.showTerminalItems(items, 'Select machine to create new terminal');
    }

    private getOpts(placeholder: string, fuzzyMatchLabel: boolean = true): QuickOpenOptions {
        return QuickOpenOptions.resolve({
            placeholder,
            fuzzyMatchLabel,
            fuzzySort: false
        });
    }

    private showTerminalItems(items: QuickOpenItem | QuickOpenItem[], placeholder: string): void {
        this.quickOpenService.open(this.getModel(Array.isArray(items) ? items : [items]), this.getOpts(placeholder));
    }

    private getModel(items: QuickOpenItem | QuickOpenItem[]): QuickOpenModel {
        return {
            onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                acceptor(Array.isArray(items) ? items : [items]);
            }
        };
    }
}

export class NewTerminalItem extends QuickOpenItem {

    constructor(
        protected readonly _machineName: string,
        private readonly execute: (item: NewTerminalItem) => void
    ) {
        super({
            label: _machineName,
        });
    }

    get machineName(): string {
        return this._machineName;
    }

    run(mode: QuickOpenMode): boolean {
        if (mode !== QuickOpenMode.OPEN) {
            return false;
        }
        this.execute(this);

        return true;
    }
}
