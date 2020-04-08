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
import {
    QuickOpenMode, QuickOpenOptions, ApplicationShell, KeybindingRegistry,
    QuickOpenModel, QuickOpenItem, QuickOpenHandler, QuickOpenService, QuickOpenGroupItem, QuickOpenGroupItemOptions, QuickOpenItemOptions
} from '@theia/core/lib/browser';
import { CHEWorkspaceService } from '../../common/workspace-service';
import { TerminalApiEndPointProvider } from '../server-definition/terminal-proxy-creator';
import { OpenTerminalHandler } from './exec-terminal-contribution';
import { isDevContainer } from './terminal-command-filter';

@injectable()
export class TerminalQuickOpenService implements QuickOpenHandler, QuickOpenModel {
    prefix: string = 'term ';
    description: string = 'Create new terminal for specific container.';
    private items: QuickOpenItem[] = [];

    @inject(QuickOpenService)
    private readonly quickOpenService: QuickOpenService;

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

    async displayListMachines(doOpen: OpenTerminalHandler): Promise<void> {
        this.items = [];

        const containers = await this.workspaceService.getContainerList();

        const devContainers = containers.filter(container => isDevContainer(container));
        const toolingContainers = containers.filter(container => !isDevContainer(container));

        this.items.push(
            ...devContainers.map((container, index) => {
                const options: QuickOpenItemOptions = {
                    label: container.name,
                    run(mode: QuickOpenMode): boolean {
                        if (mode !== QuickOpenMode.OPEN) {
                            return false;
                        }
                        doOpen(container.name);

                        return true;
                    }
                };

                const group: QuickOpenGroupItemOptions = {
                    groupLabel: index === 0 ? devContainers.length === 1 ? 'Developer Container' : 'Developer Containers' : '',
                    showBorder: false
                };

                return new QuickOpenGroupItem<QuickOpenGroupItemOptions>({ ...options, ...group });
            }),
            ...toolingContainers.map((container, index) => {
                const options: QuickOpenItemOptions = {
                    label: container.name,
                    run(mode: QuickOpenMode): boolean {
                        if (mode !== QuickOpenMode.OPEN) {
                            return false;
                        }
                        doOpen(container.name);

                        return true;
                    }
                };

                const group: QuickOpenGroupItemOptions = {
                    groupLabel: devContainers.length <= 0 ? '' : index === 0 ? toolingContainers.length === 1 ? 'Tooling Container' : 'Tooling Containers' : '',
                    showBorder: devContainers.length <= 0 ? false : index === 0 ? true : false
                };

                return new QuickOpenGroupItem<QuickOpenGroupItemOptions>({ ...options, ...group });
            })
        );

        this.showTerminalItems();
    }

    protected getShortCutCommand(): string | undefined {
        const keyCommand = this.keybindingRegistry.getKeybindingsForCommand(this.terminalInSpecificContainerCommandId);
        if (keyCommand) {
            const accel = this.keybindingRegistry.acceleratorFor(keyCommand[0], '+');
            return accel.join(' ');
        }

        return undefined;
    }

    getOptions(): QuickOpenOptions {
        const placeholder = 'Select container to create new terminal';
        return {
            placeholder: placeholder,
            fuzzyMatchLabel: true,
            fuzzyMatchDescription: true,
            fuzzySort: false
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
