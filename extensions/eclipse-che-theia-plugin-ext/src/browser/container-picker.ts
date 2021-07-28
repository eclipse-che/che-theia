/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DevfileComponentStatus, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

const CONTAINERS_PLACE_HOLDER = 'Pick a container to run the task';

@injectable()
export class ContainerPicker {
  @inject(DevfileService)
  protected readonly devfileService: DevfileService;

  @inject(QuickInputService)
  private readonly quickInputService: QuickInputService;

  private componentStatuses: DevfileComponentStatus[];
  protected items: QuickPickItem[];

  /**
   * Returns a container name if there's just one container in the current workspace.
   * Shows a quick open widget and allows to pick a container if there are several ones.
   * @param containerNames containers for displaying in quick open widget,
   *        all containers of the current workspace will be displayed if the optional parameter is absent
   */

  async pick(containerNames?: string[]): Promise<string> {
    this.items = [];

    if (!containerNames || containerNames.length < 1) {
      return this.pickContainers();
    }

    if (containerNames.length === 1) {
      return containerNames[0];
    }

    return new Promise<string>(resolve => {
      this.items.push(
        ...containerNames.map(
          containerName =>
            ({
              label: containerName,
              execute: (item: QuickPickItem) => {
                resolve(containerName);
                return true;
              },
            } as QuickPickItem)
        )
      );

      this.quickInputService.showQuickPick(this.items, { placeholder: CONTAINERS_PLACE_HOLDER });
    });
  }

  protected async pickContainers(): Promise<string> {
    this.items = [];
    if (!this.componentStatuses) {
      this.componentStatuses = await this.devfileService.getComponentStatuses();
    }
    if (this.componentStatuses.length === 1) {
      return this.componentStatuses[0].name;
    }

    return new Promise<string>(resolve => {
      this.items = this.toQuickPickItems(container => {
        resolve(container);
      });
      this.quickInputService.showQuickPick(this.items, { placeholder: CONTAINERS_PLACE_HOLDER });
    });
  }

  private toQuickPickItems(handler: { (containerName: string): void }): QuickPickItem[] {
    const items: QuickPickItem[] = [];

    const devContainers = this.componentStatuses.filter(component => component.isUser);
    const toolingContainers = this.componentStatuses.filter(component => !component.isUser);

    const devContainerItems = devContainers.map(
      container =>
        ({
          label: container.name,
          execute: (item: QuickPickItem) => {
            handler(container.name);
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
            handler(container.name);
            return true;
          },
        } as QuickPickItem)
    );

    if (toolingContainerItems.length > 0) {
      const groupLabel = toolingContainers.length === 1 ? 'Tooling Container' : 'Tooling Containers';
      toolingContainerItems.unshift({ type: 'separator', label: groupLabel });
    }

    items.push(...devContainerItems, ...toolingContainerItems);

    return items;
  }
}
