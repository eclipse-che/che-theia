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
import {
  QuickOpenGroupItem,
  QuickOpenItem,
  QuickOpenMode,
  QuickOpenModel,
} from '@theia/core/lib/common/quick-open-model';
import { QuickOpenOptions, QuickOpenService } from '@theia/core/lib/browser/quick-open/quick-open-service';
import { inject, injectable } from 'inversify';

import { QuickOpenHandler } from '@theia/core/lib/browser/quick-open';

const CONTAINERS_PLACE_HOLDER = 'Pick a container to run the task';

@injectable()
export class ContainerPicker implements QuickOpenHandler, QuickOpenModel {
  prefix: string = 'container ';
  description: string = 'Pick a container name.';

  @inject(DevfileService)
  protected readonly devfileService: DevfileService;

  @inject(QuickOpenService)
  protected readonly quickOpenService: QuickOpenService;

  private componentStatuses: DevfileComponentStatus[];
  protected items: QuickOpenGroupItem[];

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
            new QuickOpenGroupItem({
              label: containerName,
              showBorder: false,
              run(mode: QuickOpenMode): boolean {
                if (mode !== QuickOpenMode.OPEN) {
                  return false;
                }
                resolve(containerName);
                return true;
              },
            })
        )
      );

      this.quickOpenService.open(this, this.getOptions());
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
      this.quickOpenService.open(this, this.getOptions());
    });
  }

  private toQuickPickItems(handler: { (containerName: string): void }): QuickOpenGroupItem[] {
    const items: QuickOpenGroupItem[] = [];

    const devContainers = this.componentStatuses.filter(component => component.isUser);
    const toolingContainers = this.componentStatuses.filter(component => !component.isUser);

    items.push(
      ...devContainers.map(
        (container, index) =>
          new QuickOpenGroupItem({
            label: container.name,
            groupLabel:
              index === 0 ? (devContainers.length === 1 ? 'Developer Container' : 'Developer Containers') : '',
            showBorder: false,
            run(mode: QuickOpenMode): boolean {
              if (mode !== QuickOpenMode.OPEN) {
                return false;
              }
              handler(container.name);
              return true;
            },
          })
      )
    );

    items.push(
      ...toolingContainers.map(
        (container, index) =>
          new QuickOpenGroupItem({
            label: container.name,
            groupLabel:
              devContainers.length <= 0
                ? ''
                : index === 0
                ? toolingContainers.length === 1
                  ? 'Tooling Container'
                  : 'Tooling Containers'
                : '',
            showBorder: devContainers.length <= 0 ? false : index === 0 ? true : false,
            run(mode: QuickOpenMode): boolean {
              if (mode !== QuickOpenMode.OPEN) {
                return false;
              }
              handler(container.name);
              return true;
            },
          })
      )
    );

    return items;
  }

  getOptions(): QuickOpenOptions {
    return {
      placeholder: CONTAINERS_PLACE_HOLDER,
      fuzzyMatchLabel: true,
      fuzzyMatchDescription: true,
      fuzzySort: false,
    };
  }

  onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
    acceptor(this.items);
  }

  getModel(): QuickOpenModel {
    return this;
  }
}
