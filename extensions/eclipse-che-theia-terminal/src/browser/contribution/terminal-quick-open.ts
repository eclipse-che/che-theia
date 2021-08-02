/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ApplicationShell, KeybindingRegistry, QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

import { OpenTerminalHandler } from './exec-terminal-contribution';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { isDevContainer } from './terminal-command-filter';

@injectable()
export class TerminalQuickOpenService {
  private items: QuickPickItem[] = [];

  @inject(QuickInputService)
  private readonly quickInputService: QuickInputService;

  @inject(WorkspaceService)
  protected readonly workspaceService: WorkspaceService;

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

    const devContainerItems = devContainers.map(
      container =>
        ({
          label: container.name,
          execute: (item: QuickPickItem) => {
            setTimeout(() => doOpen(container.name), 0);
            return true;
          },
        } as QuickPickItem)
    );

    if (devContainerItems.length > 0) {
      const groupLabel = devContainers.length === 1 ? 'Developer Container' : 'Developer Containers';
      devContainerItems.unshift({ type: 'separator', label: groupLabel });
    }

    const toolingContainerItems = toolingContainers.map(
      container =>
        ({
          label: container.name,
          execute: (item: QuickPickItem) => {
            setTimeout(() => doOpen(container.name), 0);
            return true;
          },
        } as QuickPickItem)
    );

    if (toolingContainerItems.length > 0) {
      const groupLabel = toolingContainers.length === 1 ? 'Tooling Container' : 'Tooling Containers';
      toolingContainerItems.unshift({ type: 'separator', label: groupLabel });
    }

    this.items.push(...devContainerItems, ...toolingContainerItems);

    this.quickInputService.showQuickPick(this.items, { placeholder: 'Select container to create new terminal' });
  }

  protected getShortCutCommand(): string | undefined {
    const keyCommand = this.keybindingRegistry.getKeybindingsForCommand(this.terminalInSpecificContainerCommandId);
    if (keyCommand) {
      const accel = this.keybindingRegistry.acceleratorFor(keyCommand[0], '+');
      return accel.join(' ');
    }

    return undefined;
  }
}
