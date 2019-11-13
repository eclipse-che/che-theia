/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { QuickPickItem, window } from '@theia/plugin';
import { CheWorkspaceClient, WorkspaceContainer, CONTAINER_SOURCE_ATTRIBUTE, RECIPE_CONTAINER_SOURCE } from '../che-workspace-client';

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
                onDidSelectItem: (item => {
                    resolve((<QuickPickItem>item).label);
                })
            });
        });
    }

    private async pickContainerFromClient(): Promise<string> {
        const containers = await this.cheWorkspaceClient.getContainers();

        if (containers.length === 1) {
            return Promise.resolve(containers[0].name);
        }

        const items = this.toQuickPickItems(containers);

        return this.showQuickPick(items);
    }

    private toQuickPickItems(containers: WorkspaceContainer[]): QuickPickItem[] {
        const items: QuickPickItem[] = [];

        const devContainers = containers.filter(container => this.isDevContainer(container));
        const toolingContainers = containers.filter(container => !this.isDevContainer(container));

        items.push(...devContainers.map((container, index) => <QuickPickItem>{
            label: container.name,
            groupLabel: index === 0 ? devContainers.length === 1 ? 'Developer Container' : 'Developer Containers' : '',
            showBorder: false
        }
        ));

        items.push(...toolingContainers.map((container, index) => <QuickPickItem>{
            label: container.name,
            groupLabel: devContainers.length <= 0 ? '' : index === 0 ? toolingContainers.length === 1 ? 'Tooling Container' : 'Tooling Containers' : '',
            showBorder: devContainers.length <= 0 ? false : index === 0 ? true : false
        }
        ));

        return items;
    }

    private isDevContainer(container: WorkspaceContainer): boolean {
        return container.attributes !== undefined
            && (!container.attributes[CONTAINER_SOURCE_ATTRIBUTE] || container.attributes[CONTAINER_SOURCE_ATTRIBUTE] === RECIPE_CONTAINER_SOURCE);
    }
}
