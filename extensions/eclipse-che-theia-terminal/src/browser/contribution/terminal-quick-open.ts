/**********************************************************************
 * Copyright (c) 2018-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ApplicationShell, KeybindingRegistry, QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { Container, WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';
import { isDevContainer, isToolingContainer } from './terminal-command-filter';

import { OpenTerminalHandler } from './exec-terminal-contribution';

@injectable()
export class TerminalQuickOpenService {
  @inject(QuickInputService)
  private readonly quickInputService: QuickInputService;

  @inject(WorkspaceService)
  protected readonly workspaceService: WorkspaceService;

  @inject(ApplicationShell)
  protected readonly shell: ApplicationShell;

  @inject(KeybindingRegistry)
  protected readonly keybindingRegistry: KeybindingRegistry;

  /** @deprecated use {@link displayContainers} instead */
  async displayListMachines(doOpen: OpenTerminalHandler): Promise<void> {
    const items = [];

    const containers = await this.workspaceService.getContainerList();
    const devContainers = containers.filter((container: Container) => isDevContainer(container));
    const toolingContainers = containers.filter((container: Container) => isToolingContainer(container));

    const devContainerItems = devContainers.map(
      (container: Container) =>
        ({
          label: container.name,
          execute: () => {
            setTimeout(() => doOpen(container.name), 0);
          },
        } as QuickPickItem)
    );

    if (devContainerItems.length > 0) {
      const groupLabel = devContainers.length === 1 ? 'Developer Container' : 'Developer Containers';
      devContainerItems.unshift({ type: 'separator', label: groupLabel });
    }

    const toolingContainerItems = toolingContainers.map(
      (container: Container) =>
        ({
          label: container.name,
          execute: () => {
            setTimeout(() => doOpen(container.name), 0);
          },
        } as QuickPickItem)
    );

    if (toolingContainerItems.length > 0) {
      const groupLabel = toolingContainers.length === 1 ? 'Tooling Container' : 'Tooling Containers';
      toolingContainerItems.unshift({ type: 'separator', label: groupLabel });
    }

    items.push(...devContainerItems, ...toolingContainerItems);

    this.quickInputService.showQuickPick(items, { placeholder: 'Select container to create a new terminal' });
  }

  async displayContainers(containers: Container[], doOpen: OpenTerminalHandler): Promise<void> {
    if (containers.length < 1) {
      return;
    }

    const items: QuickPickItem[] = containers.map(
      container =>
        ({
          label: container.name,
          execute: () => {
            setTimeout(() => doOpen(container.name), 0);
          },
        } as QuickPickItem)
    );

    this.quickInputService.showQuickPick(items, { placeholder: 'Select a container to create a new terminal' });
  }
}
