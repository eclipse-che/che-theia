/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ChePluginCommandContribution, ChePluginManagerCommands } from './che-plugin-command-contribution';
import { Emitter, Event } from '@theia/core/lib/common';
import { inject, injectable } from 'inversify';

import { Menu } from '@phosphor/widgets';
import { CommandRegistry as PhosphorCommandRegistry } from '@phosphor/commands';

@injectable()
export class ChePluginMenu {
  @inject(ChePluginCommandContribution)
  protected readonly chePluginCommandContribution: ChePluginCommandContribution;

  protected readonly menuClosed = new Emitter<void>();

  get onMenuClosed(): Event<void> {
    return this.menuClosed.event;
  }

  show(x: number, y: number): void {
    const commands = new PhosphorCommandRegistry();
    const menu = new Menu({
      commands,
    });

    this.addCommands(commands, menu);

    menu.aboutToClose.connect(() => {
      this.menuClosed.fire(undefined);
    });

    menu.open(x, y);
  }

  /**
   * Adds commands to the menu for running plugin.
   */
  protected addCommands(commands: PhosphorCommandRegistry, menu: Menu): void {
    commands.addCommand(ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS.id, {
      label: ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS.label,
      execute: () => this.showAvailablePlugins(),
    });

    commands.addCommand(ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS.id, {
      label: ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS.label,
      execute: () => this.showInstalledPlugins(),
    });

    commands.addCommand(ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS.id, {
      label: ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS.label,
      execute: () => this.showBuiltInPlugins(),
    });

    commands.addCommand(ChePluginManagerCommands.ADD_REGISTRY.id, {
      label: ChePluginManagerCommands.ADD_REGISTRY.label,
      execute: () => this.chePluginCommandContribution.addPluginRegistry(),
    });

    commands.addCommand(ChePluginManagerCommands.REFRESH.id, {
      label: ChePluginManagerCommands.REFRESH.label,
      execute: () => this.refreshPluginList(),
    });

    menu.addItem({
      type: 'command',
      command: ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS.id,
    });

    menu.addItem({
      type: 'command',
      command: ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS.id,
    });

    menu.addItem({
      type: 'command',
      command: ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS.id,
    });

    menu.addItem({
      type: 'separator',
    });

    menu.addItem({
      type: 'command',
      command: ChePluginManagerCommands.ADD_REGISTRY.id,
    });

    menu.addItem({
      type: 'command',
      command: ChePluginManagerCommands.REFRESH.id,
    });
  }

  /********************************************************************************
   * Changing current filter
   ********************************************************************************/

  protected readonly changeFilterEvent = new Emitter<string>();

  get onChangeFilter(): Event<string> {
    return this.changeFilterEvent.event;
  }

  async showAvailablePlugins(): Promise<void> {
    this.changeFilterEvent.fire('');
  }

  // @installed
  async showInstalledPlugins(): Promise<void> {
    this.changeFilterEvent.fire('@installed');
  }

  // @builtin
  // Displays a list of built in plugins provided inside Theia editor container.
  async showBuiltInPlugins(): Promise<void> {
    this.changeFilterEvent.fire('@builtin');
  }

  /********************************************************************************
   * Refreshing the list of plugins
   ********************************************************************************/

  protected readonly refreshPluginListEvent = new Emitter<void>();

  get onRefreshPluginList(): Event<void> {
    return this.refreshPluginListEvent.event;
  }

  async refreshPluginList(): Promise<void> {
    this.refreshPluginListEvent.fire();
  }
}
