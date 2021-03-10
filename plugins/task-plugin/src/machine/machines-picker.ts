/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheWorkspaceClient, WorkspaceContainer } from '../che-workspace-client';
import { QuickPickItem, window } from '@theia/plugin';
import { inject, injectable } from 'inversify';

const CONTAINERS_PLACE_HOLDER = 'Pick a container to run the task';
export const COMPONENT_ATTRIBUTE: string = 'component';

@injectable()
export class MachinesPicker {
  @inject(CheWorkspaceClient)
  protected readonly cheWorkspaceClient!: CheWorkspaceClient;

  /**
   * Returns a container name if there's just one container in the current workspace.
   * Shows a quick open widget and allows to pick a container if there are several ones.
   * @param containerNames containers for displaying in quick open widget,
   *        all containers of the current workspace will be displayed if the optional parameter is absent
   */
  async pick(containerNames?: string[]): Promise<string> {
    if (!containerNames) {
      return this.pickContainerFromClient();
    }

    if (containerNames.length === 1) {
      return Promise.resolve(containerNames[0]);
    }
    return this.showQuickPick(containerNames.map(containerName => ({ label: containerName })));
  }

  private showQuickPick(items: QuickPickItem[]): Promise<string> {
    return new Promise<string>(resolve => {
      if (items.length === 0) {
        return;
      }

      window.showQuickPick(items, {
        placeHolder: CONTAINERS_PLACE_HOLDER,
        ignoreFocusOut: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDidSelectItem: (item: any) => {
          resolve((<QuickPickItem>item).label);
        },
      });
    });
  }

  private async pickContainerFromClient(): Promise<string> {
    const containers = await this.cheWorkspaceClient.getComponentStatuses();

    if (containers.length === 1) {
      return Promise.resolve(containers[0].name);
    }

    const items = this.toQuickPickItems(containers);

    return this.showQuickPick(items);
  }

  private toQuickPickItems(containers: WorkspaceContainer[]): QuickPickItem[] {
    const items: QuickPickItem[] = [];

    const devContainers = containers.filter(container => container.isUser);
    const toolingContainers = containers.filter(container => !container.isUser);

    items.push(
      ...devContainers.map(
        (container, index) =>
          <QuickPickItem>{
            label: container.name,
            groupLabel:
              index === 0 ? (devContainers.length === 1 ? 'Developer Container' : 'Developer Containers') : '',
            showBorder: false,
          }
      )
    );

    items.push(
      ...toolingContainers.map(
        (container, index) =>
          <QuickPickItem>{
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
          }
      )
    );

    return items;
  }
}
