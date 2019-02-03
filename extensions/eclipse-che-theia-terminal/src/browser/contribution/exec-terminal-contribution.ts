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
import { CommandRegistry, MenuModelRegistry, Command } from '@theia/core/lib/common';
import { ApplicationShell, KeybindingRegistry, Key, KeyCode, KeyModifier } from '@theia/core/lib/browser';

import { TerminalQuickOpenService } from './terminal-quick-open';
import { TerminalFrontendContribution, TerminalMenus } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalApiEndPointProvider } from '../server-definition/terminal-proxy-creator';
import { BrowserMainMenuFactory } from '@theia/core/lib/browser/menu/browser-menu-plugin';
import { MenuBar as MenuBarWidget } from '@phosphor/widgets';
import { TerminalKeybindingContext } from './keybinding-context';
import { CHEWorkspaceService } from '../../common/workspace-service';
import { TerminalWidget, TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';
import { REMOTE_TERMINAL_WIDGET_FACTORY_ID } from '../terminal-widget/remote-terminal-widget';
import URI from '@theia/core/lib/common/uri';

export const NewTerminalInSpecificContainer = {
    id: 'terminal-in-specific-container:new',
    label: 'Open Terminal in specific container'
};

export interface OpenTerminalHandler {
    (containerName: string)
}

@injectable()
export class ExecTerminalFrontendContribution extends TerminalFrontendContribution {

    @inject(TerminalQuickOpenService)
    private readonly terminalQuickOpen: TerminalQuickOpenService;

    @inject('TerminalApiEndPointProvider')
    protected readonly termApiEndPointProvider: TerminalApiEndPointProvider;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(BrowserMainMenuFactory)
    protected readonly mainMenuFactory: BrowserMainMenuFactory;

    @inject(CHEWorkspaceService)
    protected readonly cheWorkspaceService: CHEWorkspaceService;

    private readonly mainMenuId = 'theia:menubar';

    async registerCommands(registry: CommandRegistry) {
        const serverUrl = <URI | undefined> await this.termApiEndPointProvider();
        if (serverUrl) {
            registry.registerCommand(NewTerminalInSpecificContainer, {
                execute: () => {
                    this.terminalQuickOpen.displayListMachines((containerName) => {
                        this.openTerminalByContainerName(containerName);
                    });
                }
            });
            await this.registerTerminalCommandPerContainer(registry);
        } else {
            super.registerCommands(registry);
        }
    }

    private async registerTerminalCommandPerContainer(registry: CommandRegistry) {
        const containers = await this.cheWorkspaceService.getMachineList();

        for (const containerName in containers) {
            if (containers.hasOwnProperty(containerName)) {
                const termCommandPerContainer: Command = {
                    id: "terminal-for-" + containerName + "-container:new",
                    label: "New terminal for " + containerName
                };
                registry.registerCommand(termCommandPerContainer, {
                    execute: async () => this.openTerminalByContainerName(containerName)
                });
            }
        }
    }

    async openTerminalByContainerName(containerName: string): Promise<void> {
        const termWidget = await this.terminalQuickOpen.newTerminalPerContainer(containerName, {});
        this.open(termWidget, {});
        termWidget.start();
    }

    async newTerminal(options: TerminalWidgetOptions): Promise<TerminalWidget> {
        let containerName;

        if (options.attributes) {
            containerName = options.attributes['CHE_MACHINE_NAME'];
        }

        if (!containerName) {
            containerName = await this.cheWorkspaceService.findEditorMachineName();
        }

        if (containerName) {
            const termWidget = await this.terminalQuickOpen.newTerminalPerContainer(containerName, options);
            return termWidget;
        }

        throw new Error('Unable to create new terminal widget');
    }

    get all(): TerminalWidget[] {
        return this.widgetManager.getWidgets(REMOTE_TERMINAL_WIDGET_FACTORY_ID) as TerminalWidget[];
    }

    async registerMenus(menus: MenuModelRegistry) {
        const serverUrl = <URI | undefined> await this.termApiEndPointProvider();
        if (serverUrl) {
            menus.registerSubmenu(TerminalMenus.TERMINAL, 'Terminal');
            menus.registerMenuAction(TerminalMenus.TERMINAL_NEW, {
                commandId: NewTerminalInSpecificContainer.id,
                label: NewTerminalInSpecificContainer.label
            });
        } else {
            super.registerMenus(menus);
        }

        /*
            TODO: We applied menu contribution to the menu model registry by 'menus.registerMenuAction' above,
            but after that Theia doesn't redraw menu widget, because Theia already rendered ui with older data
            and cached old state.
            So follow we do workaround:
            find main menu bar widget, destroy it and replace by new one widget with the latest changes.
        */
        const widgets = this.shell.getWidgets('top');
        widgets.forEach(widget => {
            if (widget.id === this.mainMenuId && widget instanceof MenuBarWidget) {
                widget.dispose();
                const newMenu = this.mainMenuFactory.createMenuBar();
                this.shell.addWidget(newMenu, { area: 'top' });
            }
        });
    }

    async registerKeybindings(registry: KeybindingRegistry) {
        const serverUrl = <URI | undefined> await this.termApiEndPointProvider();
        if (serverUrl) {
            registry.registerKeybinding({
                command: NewTerminalInSpecificContainer.id,
                keybinding: 'ctrl+`'
            });
            this.registerTerminalKeybindings(registry);
        } else {
            super.registerKeybindings(registry);
        }
    }

    private registerTerminalKeybindings(registry: KeybindingRegistry) {
        // Ctrl + a-z
        this.registerRangeKeyBindings(registry, [KeyModifier.CTRL], Key.KEY_A, 25, 'Key');
        // Alt + a-z
        this.registerRangeKeyBindings(registry, [KeyModifier.Alt], Key.KEY_A, 25, 'Key');
        // Ctrl 0-9
        this.registerRangeKeyBindings(registry, [KeyModifier.CTRL], Key.DIGIT0, 9, 'Digit');
        // Alt 0-9
        this.registerRangeKeyBindings(registry, [KeyModifier.Alt], Key.DIGIT0, 9, 'Digit');

        this.registerKeyBinding(registry, [KeyModifier.CTRL], Key.SPACE);
        this.registerKeyBinding(registry, [KeyModifier.CTRL], Key.BRACKET_LEFT);
        this.registerKeyBinding(registry, [KeyModifier.CTRL], Key.BRACKET_RIGHT);
        this.registerKeyBinding(registry, [KeyModifier.CTRL], Key.BACKSLASH);
        this.registerKeyBinding(registry, [KeyModifier.Alt], Key.BACKQUOTE);
    }

    private registerRangeKeyBindings(registry: KeybindingRegistry, keyModifiers: KeyModifier[], startKey: Key, offSet: number, codePrefix: string) {
        for (let i = 0; i < offSet + 1; i++) {
            const keyCode = startKey.keyCode + i;
            const key = {
                keyCode: keyCode,
                code: codePrefix + String.fromCharCode(keyCode)
            };
            this.registerKeyBinding(registry, keyModifiers, key);
        }
    }

    private registerKeyBinding(registry: KeybindingRegistry, keyModifiers: KeyModifier[], key: Key) {
        const keybinding = KeyCode.createKeyCode({ first: key, modifiers: keyModifiers }).toString();
        registry.registerKeybinding({
            command: KeybindingRegistry.PASSTHROUGH_PSEUDO_COMMAND,
            keybinding: keybinding,
            context: TerminalKeybindingContext.contextId
        });
    }
}
