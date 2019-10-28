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
import * as theia from '@theia/plugin';
import { CheWorkspaceClient } from '../che-workspace-client';
import { che as cheApi } from '@eclipse-che/api';

const MACHINES_PLACE_HOLDER = 'Pick a machine to run the task';
const RECIPE_CONTAINER_SOURCE = 'recipe';
const CONTAINER_SOURCE_ATTRIBUTE = 'source';

@injectable()
export class MachinesPicker {

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    async pick(): Promise<string> {
        return this.doPick(true);
    }

    protected async doPick(hideToolingContainers: boolean): Promise<string> {
        const containers = await this.getContainers(hideToolingContainers);

        if (containers.length === 1 && !hideToolingContainers) {
            return Promise.resolve(containers[0]);
        }

        return new Promise<string>(resolve => {

            const items: theia.QuickPickItem[] = [];
            for (const container of containers) {
                items.push(new ContainerItem(container));
            }

            if (hideToolingContainers) {
                items.push(new LoadMoreItem());
            }

            const options = { placeHolder: MACHINES_PLACE_HOLDER } as theia.QuickPickOptions;
            options.onDidSelectItem = (async item => {
                if (item instanceof ContainerItem) {
                    resolve(item.label);
                } else if (item instanceof LoadMoreItem) {
                    const containerName = await this.doPick(false);
                    resolve(containerName);
                }
            });
            theia.window.showQuickPick(items, options);
        });
    }

    protected async getContainers(hideToolContainers: boolean): Promise<string[]> {
        const filteredContainers: string[] = [];
        const containers = await this.cheWorkspaceClient.getMachines();
        if (!containers) {
            return filteredContainers;
        }

        for (const container in containers) {
            if (!containers.hasOwnProperty(container)) {
                continue;
            }

            if (hideToolContainers && !this.isToolingContainer(containers[container])) {
                continue;
            }

            filteredContainers.push(container);
        }

        return filteredContainers;
    }

    private isToolingContainer(container: cheApi.workspace.Machine): boolean {
        return container.attributes !== undefined
            && (!container.attributes[CONTAINER_SOURCE_ATTRIBUTE]
                || container.attributes[CONTAINER_SOURCE_ATTRIBUTE] === RECIPE_CONTAINER_SOURCE);
    }
}

export class ContainerItem implements theia.QuickPickItem {

    constructor(
        public readonly containerName: string,
    ) {
        this.label = containerName;
    }

    label: string;
}

export class LoadMoreItem implements theia.QuickPickItem {

    constructor() {
        this.label = 'Show Tooling Containers...';
    }

    label: string;

}
