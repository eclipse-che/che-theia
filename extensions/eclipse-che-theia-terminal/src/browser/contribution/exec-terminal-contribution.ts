/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  ApplicationShell,
  Key,
  KeyCode,
  KeyModifier,
  KeybindingRegistry,
  QuickOpenContribution,
  QuickOpenHandlerRegistry,
} from '@theia/core/lib/browser';
import { Command, CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import {
  REMOTE_TERMINAL_WIDGET_FACTORY_ID,
  RemoteTerminalWidgetFactoryOptions,
} from '../terminal-widget/remote-terminal-widget';
import {
  TerminalCommands,
  TerminalFrontendContribution,
  TerminalMenus,
} from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalWidget, TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';
import { inject, injectable } from 'inversify';

import { BrowserMainMenuFactory } from '@theia/core/lib/browser/menu/browser-menu-plugin';
import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { MenuBar as MenuBarWidget } from '@phosphor/widgets';
import { TERMINAL_WIDGET_FACTORY_ID } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { TerminalApiEndPointProvider } from '../server-definition/terminal-proxy-creator';
import { TerminalKeybindingContext } from './keybinding-context';
import { TerminalKeybindingContexts } from '@theia/terminal/lib/browser/terminal-keybinding-contexts';
import { TerminalQuickOpenService } from './terminal-quick-open';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { filterRecipeContainers } from './terminal-command-filter';
import { isOSX } from '@theia/core/lib/common/os';

export const NewTerminalInSpecificContainer = {
  id: 'terminal-in-specific-container:new',
  label: 'Open Terminal in specific container',
};

export interface OpenTerminalHandler {
  (containerName: string): void;
}

@injectable()
export class ExecTerminalFrontendContribution extends TerminalFrontendContribution implements QuickOpenContribution {
  @inject(TerminalQuickOpenService)
  private readonly terminalQuickOpen: TerminalQuickOpenService;

  @inject('TerminalApiEndPointProvider')
  protected readonly termApiEndPointProvider: TerminalApiEndPointProvider;

  @inject(ApplicationShell)
  protected readonly shell: ApplicationShell;

  @inject(BrowserMainMenuFactory)
  protected readonly mainMenuFactory: BrowserMainMenuFactory;

  @inject(WorkspaceService)
  protected readonly remoteWorkspaceService: WorkspaceService;

  @inject(EndpointService)
  protected readonly endpointService: EndpointService;

  @inject(EnvVariablesServer)
  protected readonly baseEnvVariablesServer: EnvVariablesServer;

  private readonly mainMenuId = 'theia:menubar';
  private editorContainerName: string | undefined;

  async registerCommands(registry: CommandRegistry): Promise<void> {
    const serverUrl = await this.termApiEndPointProvider();
    if (serverUrl) {
      registry.registerCommand(NewTerminalInSpecificContainer, {
        execute: (containerNameToExecute: string) => {
          if (containerNameToExecute) {
            this.openTerminalByContainerName(containerNameToExecute);
          } else {
            this.terminalQuickOpen.displayListMachines(containerName => {
              this.openTerminalByContainerName(containerName);
            });
          }
        },
      });

      await this.registerTerminalCommandPerContainer(registry);

      registry.registerCommand(TerminalCommands.TERMINAL_FIND_TEXT);
      registry.registerHandler(TerminalCommands.TERMINAL_FIND_TEXT.id, {
        isEnabled: () => {
          if (this.shell.activeWidget instanceof TerminalWidget) {
            return !this.shell.activeWidget.getSearchBox().isVisible;
          }
          return false;
        },
        execute: () => {
          const termWidget = this.shell.activeWidget as TerminalWidget;
          const terminalSearchBox = termWidget.getSearchBox();
          terminalSearchBox.show();
        },
      });

      registry.registerCommand(TerminalCommands.TERMINAL_FIND_TEXT_CANCEL);
      registry.registerHandler(TerminalCommands.TERMINAL_FIND_TEXT_CANCEL.id, {
        isEnabled: () => {
          if (this.shell.activeWidget instanceof TerminalWidget) {
            return this.shell.activeWidget.getSearchBox().isVisible;
          }
          return false;
        },
        execute: () => {
          const termWidget = this.shell.activeWidget as TerminalWidget;
          const terminalSearchBox = termWidget.getSearchBox();
          terminalSearchBox.hide();
        },
      });

      registry.registerCommand(TerminalCommands.SCROLL_LINE_UP, {
        isEnabled: () => this.shell.activeWidget instanceof TerminalWidget,
        isVisible: () => false,
        execute: () => {
          (this.shell.activeWidget as TerminalWidget).scrollLineUp();
        },
      });

      registry.registerCommand(TerminalCommands.SCROLL_LINE_DOWN, {
        isEnabled: () => this.shell.activeWidget instanceof TerminalWidget,
        isVisible: () => false,
        execute: () => {
          (this.shell.activeWidget as TerminalWidget).scrollLineDown();
        },
      });

      registry.registerCommand(TerminalCommands.SCROLL_TO_TOP, {
        isEnabled: () => this.shell.activeWidget instanceof TerminalWidget,
        isVisible: () => false,
        execute: () => {
          (this.shell.activeWidget as TerminalWidget).scrollToTop();
        },
      });

      registry.registerCommand(TerminalCommands.SCROLL_PAGE_UP, {
        isEnabled: () => this.shell.activeWidget instanceof TerminalWidget,
        isVisible: () => false,
        execute: () => {
          (this.shell.activeWidget as TerminalWidget).scrollPageUp();
        },
      });

      registry.registerCommand(TerminalCommands.SCROLL_PAGE_DOWN, {
        isEnabled: () => this.shell.activeWidget instanceof TerminalWidget,
        isVisible: () => false,
        execute: () => {
          (this.shell.activeWidget as TerminalWidget).scrollPageDown();
        },
      });
    } else {
      super.registerCommands(registry);
    }
  }

  private async registerTerminalCommandPerContainer(registry: CommandRegistry): Promise<void> {
    const containers = await this.remoteWorkspaceService.getContainerList();

    for (const container of filterRecipeContainers(containers)) {
      const termCommandPerContainer: Command = {
        id: 'terminal-for-' + container.name + '-container:new',
        label: 'New terminal for ' + container.name,
      };
      registry.registerCommand(termCommandPerContainer, {
        execute: () => this.openTerminalByContainerName(container.name),
      });
    }
  }

  public async newTerminalPerContainer(
    containerName: string,
    options: TerminalWidgetOptions,
    closeWidgetOnExitOrError: boolean = true
  ): Promise<TerminalWidget> {
    try {
      const workspaceId = await this.remoteWorkspaceService.getCurrentWorkspaceId();
      const termApiEndPoint = await this.termApiEndPointProvider();

      const widget = await this.widgetManager.getOrCreateWidget(REMOTE_TERMINAL_WIDGET_FACTORY_ID, <
        RemoteTerminalWidgetFactoryOptions
      >{
        created: new Date().toString(),
        machineName: containerName,
        workspaceId,
        endpoint: termApiEndPoint!.toString(true),
        closeWidgetOnExitOrError,
        ...options,
      });
      return widget as TerminalWidget;
    } catch (err) {
      console.error('Failed to create terminal widget. Cause: ', err);
    }
    throw new Error('Unable to create new terminal for machine: ' + containerName);
  }

  async openTerminalByContainerName(containerName: string): Promise<void> {
    const cwd = await this.selectTerminalCwd();
    const termWidget = await this.newTerminalPerContainer(containerName, { cwd });
    this.open(termWidget);
    termWidget.start();
  }

  async getEditorContainerName(): Promise<string | undefined> {
    if (!this.editorContainerName) {
      const ideComponents = await this.endpointService.getEndpointsByType('ide');
      if (ideComponents.length !== 1) {
        throw new Error('Only one endpoint should be of ide type.');
      }
      const ideComponent = ideComponents[0];
      this.editorContainerName = ideComponent.component;
    }
    return this.editorContainerName;
  }

  async newTerminal(options: TerminalWidgetOptions): Promise<TerminalWidget> {
    let containerName;
    let closeWidgetExitOrError: boolean = true;

    const attributes = options.attributes;
    if (attributes) {
      const isRemoteValue = attributes['remote'];
      if (isRemoteValue && isRemoteValue.toLowerCase() === 'false') {
        return super.newTerminal(options);
      }

      containerName = attributes['CHE_MACHINE_NAME'];

      const closeWidgetOnExitOrErrorValue = attributes['closeWidgetExitOrError'];
      if (closeWidgetOnExitOrErrorValue) {
        closeWidgetExitOrError = closeWidgetOnExitOrErrorValue.toLowerCase() === 'false' ? false : true;
      }
    }

    if (!containerName) {
      containerName = await this.getEditorContainerName();
    }

    if (containerName) {
      const termWidget = await this.newTerminalPerContainer(containerName, options, closeWidgetExitOrError);
      return termWidget;
    }

    throw new Error('Unable to create new terminal widget');
  }

  get all(): TerminalWidget[] {
    const terminalWidgets = this.widgetManager.getWidgets(TERMINAL_WIDGET_FACTORY_ID) as TerminalWidget[];
    const remoteTerminalWidgets = this.widgetManager.getWidgets(REMOTE_TERMINAL_WIDGET_FACTORY_ID) as TerminalWidget[];

    return [...terminalWidgets, ...remoteTerminalWidgets];
  }

  async registerMenus(menus: MenuModelRegistry): Promise<void> {
    const serverUrl = await this.termApiEndPointProvider();
    if (serverUrl) {
      menus.registerSubmenu(TerminalMenus.TERMINAL, 'Terminal');
      menus.registerMenuAction(TerminalMenus.TERMINAL_NEW, {
        commandId: NewTerminalInSpecificContainer.id,
        label: NewTerminalInSpecificContainer.label,
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

  async registerKeybindings(registry: KeybindingRegistry): Promise<void> {
    const serverUrl = await this.termApiEndPointProvider();
    if (serverUrl) {
      registry.registerKeybinding({
        command: NewTerminalInSpecificContainer.id,
        keybinding: isOSX ? 'ctrl+shift+`' : 'ctrl+`',
      });

      registry.registerKeybinding({
        command: TerminalCommands.TERMINAL_FIND_TEXT.id,
        keybinding: 'ctrlcmd+f',
        context: TerminalKeybindingContexts.terminalActive,
      });

      registry.registerKeybinding({
        command: TerminalCommands.TERMINAL_FIND_TEXT_CANCEL.id,
        keybinding: 'esc',
        context: TerminalKeybindingContexts.terminalHideSearch,
      });
      this.registerScrollKeyBindings(registry);
      this.registerTerminalKeybindings(registry);
    } else {
      super.registerKeybindings(registry);
    }
  }

  private registerTerminalKeybindings(registry: KeybindingRegistry): void {
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

  private registerRangeKeyBindings(
    registry: KeybindingRegistry,
    keyModifiers: KeyModifier[],
    startKey: Key,
    offSet: number,
    codePrefix: string
  ): void {
    for (let i = 0; i < offSet + 1; i++) {
      const keyCode = startKey.keyCode + i;
      const key: Key = {
        keyCode: keyCode,
        code: codePrefix + String.fromCharCode(keyCode),
        easyString: String.fromCharCode(keyCode),
      };
      this.registerKeyBinding(registry, keyModifiers, key);
    }
  }

  private registerKeyBinding(registry: KeybindingRegistry, keyModifiers: KeyModifier[], key: Key): void {
    const keybinding = KeyCode.createKeyCode({ first: key, modifiers: keyModifiers }).toString();
    registry.registerKeybinding({
      command: KeybindingRegistry.PASSTHROUGH_PSEUDO_COMMAND,
      keybinding: keybinding,
      context: TerminalKeybindingContext.contextId,
    });
  }

  private registerScrollKeyBindings(registry: KeybindingRegistry): void {
    registry.registerKeybinding({
      command: TerminalCommands.SCROLL_LINE_UP.id,
      keybinding: 'ctrl+shift+up',
      context: TerminalKeybindingContexts.terminalActive,
    });
    registry.registerKeybinding({
      command: TerminalCommands.SCROLL_LINE_DOWN.id,
      keybinding: 'ctrl+shift+down',
      context: TerminalKeybindingContexts.terminalActive,
    });
    registry.registerKeybinding({
      command: TerminalCommands.SCROLL_TO_TOP.id,
      keybinding: 'shift+home',
      context: TerminalKeybindingContexts.terminalActive,
    });
    registry.registerKeybinding({
      command: TerminalCommands.SCROLL_PAGE_UP.id,
      keybinding: 'shift+pageUp',
      context: TerminalKeybindingContexts.terminalActive,
    });
    registry.registerKeybinding({
      command: TerminalCommands.SCROLL_PAGE_DOWN.id,
      keybinding: 'shift+pageDown',
      context: TerminalKeybindingContexts.terminalActive,
    });
  }

  registerQuickOpenHandlers(handlers: QuickOpenHandlerRegistry): void {
    handlers.registerHandler(this.terminalQuickOpen, false);
  }
}
