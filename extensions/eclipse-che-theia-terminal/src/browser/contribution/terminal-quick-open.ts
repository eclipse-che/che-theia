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
import { QuickOpenModel, QuickOpenItem, QuickOpenHandler, QuickOpenService } from '@theia/core/lib/browser/quick-open/';
import { QuickOpenMode, QuickOpenOptions, WidgetManager, ApplicationShell, KeybindingRegistry, Keybinding } from '@theia/core/lib/browser';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { REMOTE_TERMINAL_WIDGET_FACTORY_ID, RemoteTerminalWidgetFactoryOptions } from '../terminal-widget/remote-terminal-widget';
import { CHEWorkspaceService } from '../../common/workspace-service';
import { TerminalApiEndPointProvider } from '../server-definition/terminal-proxy-creator';
import { TerminalWidget, TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';
import { RemoteTerminalWidget } from '../terminal-widget/remote-terminal-widget';
import { OpenTerminalHandler } from './exec-terminal-contribution';
import { filterRecipeContainers } from './terminal-command-filter';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class TerminalQuickOpenService implements QuickOpenHandler, QuickOpenModel {
    prefix: string = 'term ';
    description: string = 'Create new terminal for specific container.';
    private items: QuickOpenItem[] = [];
    private isOpen: boolean;
    private hideToolContainers: boolean;

    @inject(QuickOpenService)
    private readonly quickOpenService: QuickOpenService;

    @inject(WidgetManager)
    private readonly widgetManager: WidgetManager;

    @inject(EnvVariablesServer)
    protected readonly baseEnvVariablesServer: EnvVariablesServer;

    @inject('TerminalApiEndPointProvider')
    protected readonly termApiEndPointProvider: TerminalApiEndPointProvider;

    @inject(CHEWorkspaceService)
    protected readonly workspaceService: CHEWorkspaceService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(KeybindingRegistry)
    protected readonly keybindingRegistry: KeybindingRegistry;

    @inject('terminal-in-specific-container-command-id')
    protected readonly terminalInSpecificContainerCommandId: string;

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

        let containers = await this.workspaceService.getContainerList();

        if (this.isOpen) {
            // trigger show/hide tool containers
            this.hideToolContainers = !this.hideToolContainers;
        } else {
            this.isOpen = true;
            this.hideToolContainers = true;
        }

        if (this.hideToolContainers) {
            containers = filterRecipeContainers(containers);
        }

        for (const container of containers) {
            items.push(new NewTerminalItem(container.name, async newTermItemFunc => {
                doOpen(newTermItemFunc.machineName);
            }));
        }

        this.items = Array.isArray(items) ? items : [items];
        this.showTerminalItems();
    }

    protected getShortCutCommand(): string | undefined {
        const keyCommand = this.keybindingRegistry.getKeybindingsForCommand(this.terminalInSpecificContainerCommandId);
        if (keyCommand) {
            const accel = Keybinding.acceleratorFor(keyCommand[0], '+');
            return accel.join(' ');
        }
        console.log(keyCommand);

        return undefined;
    }

    getOptions(): QuickOpenOptions {
        let placeholder = 'Select container to create new terminal';
        const keybinding = this.getShortCutCommand();
        if (keybinding) {
            placeholder += ` (Press ${keybinding} to show/hide tool containers)`;
        }
        return {
            placeholder: placeholder,
            fuzzyMatchLabel: true,
            fuzzyMatchDescription: true,
            fuzzySort: false,
            onClose: () => {
                this.isOpen = false;
            }
        };
    }

    private showTerminalItems(): void {
        this.quickOpenService.open(this, this.getOptions());
    }

    onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        acceptor(this.items);
    }

    getModel(): QuickOpenModel {
        return this;
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
