/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Command, MessageService } from '@theia/core/lib/common';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { inject, injectable } from 'inversify';

import { ChePluginManager } from './che-plugin-manager';
import { MonacoQuickOpenService } from '@theia/monaco/lib/browser/monaco-quick-open-service';
import { QuickInputService } from '@theia/core/lib/browser';

function cmd(id: string, label: string): Command {
  return {
    id: `${ChePluginManagerCommands.PLUGIN_MANAGER_ID}:${id}`,
    category: ChePluginManagerCommands.PLUGIN_MANAGER_CATEGORY,
    label: label,
  };
}

export namespace ChePluginManagerCommands {
  export const PLUGIN_MANAGER_ID = 'plugin-manager';
  export const PLUGIN_MANAGER_CATEGORY = 'Plugin Manager';

  export const SHOW_AVAILABLE_PLUGINS = cmd('show-available-plugins', 'Show Available Plugins');
  export const SHOW_INSTALLED_PLUGINS = cmd('show-installed-plugins', 'Show Installed Plugins');
  export const SHOW_BUILT_IN_PLUGINS = cmd('show-built-in-plugins', 'Show Built-in Plugins');

  export const ADD_REGISTRY = cmd('add-registry', 'Add Registry');
  export const REFRESH = cmd('refresh', 'Refresh');
}

@injectable()
export class ChePluginCommandContribution implements CommandContribution {
  @inject(MessageService)
  protected readonly messageService: MessageService;

  @inject(QuickInputService)
  protected readonly quickInputService: QuickInputService;

  @inject(MonacoQuickOpenService)
  protected readonly monacoQuickOpenService: MonacoQuickOpenService;

  @inject(ChePluginManager)
  protected readonly chePluginManager: ChePluginManager;

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(ChePluginManagerCommands.ADD_REGISTRY, {
      execute: () => this.addPluginRegistry(),
    });
  }

  /**
   * Displays prompt to add a new plugin registry.
   * Makes new plugin registry active and displays a list of plugins from this registry.
   */
  async addPluginRegistry(): Promise<void> {
    const name = await this.quickInputService.open({
      prompt: 'Name of your registry',
    });

    if (!name) {
      return;
    }

    const uri = await this.quickInputService.open({
      prompt: 'Registry URI',
    });

    if (!uri) {
      return;
    }

    const registry = {
      name,
      uri,
    };

    this.chePluginManager.addRegistry(registry);
  }
}
