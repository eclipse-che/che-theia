/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { che as cheApi } from '@eclipse-che/api';
import { QuickOpenHandler } from '@theia/core/lib/browser/quick-open';
import { QuickOpenOptions, QuickOpenService } from '@theia/core/lib/browser/quick-open/quick-open-service';
import { QuickOpenGroupItem, QuickOpenItem, QuickOpenMode, QuickOpenModel } from '@theia/core/lib/common/quick-open-model';
import { inject, injectable } from 'inversify';
import { CheApiService } from '../common/che-protocol';

const CONTAINERS_PLACE_HOLDER = 'Pick a container to run the task';
const RECIPE_CONTAINER_SOURCE = 'recipe';
const CONTAINER_SOURCE_ATTRIBUTE = 'source';

@injectable()
export class ContainerPicker implements QuickOpenHandler, QuickOpenModel {
    prefix: string = 'container ';
    description: string = 'Pick a container name.';

    @inject(CheApiService)
    protected readonly cheApi: CheApiService;

    @inject(QuickOpenService)
    protected readonly quickOpenService: QuickOpenService;

    private containers: { name: string, container: cheApi.workspace.Machine }[] = [];
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
            this.items.push(...containerNames.map(containerName =>
                new QuickOpenGroupItem({
                    label: containerName,
                    showBorder: false,
                    run(mode: QuickOpenMode): boolean {
                        if (mode !== QuickOpenMode.OPEN) {
                            return false;
                        }
                        resolve(containerName);
                        return true;
                    }
                })
            ));

            this.quickOpenService.open(this, this.getOptions());
        });
    }

    protected async pickContainers(): Promise<string> {
        this.items = [];

        const containers = await this.getWorkspaceContainers();
        if (containers.length === 1) {
            return containers[0].name;
        }

        return new Promise<string>(resolve => {
            this.items = this.toQuickPickItems(containers, container => {
                resolve(container);
            });
            this.quickOpenService.open(this, this.getOptions());
        });
    }

    private toQuickPickItems(containers: { name: string, container: cheApi.workspace.Machine }[], handler: { (containerName: string): void }): QuickOpenGroupItem[] {
        const items: QuickOpenGroupItem[] = [];

        const devContainers = containers.filter(container => this.isDevContainer(container));
        const toolingContainers = containers.filter(container => !this.isDevContainer(container));

        items.push(...devContainers.map((container, index) =>
            new QuickOpenGroupItem({
                label: container.name,
                groupLabel: index === 0 ? devContainers.length === 1 ? 'Developer Container' : 'Developer Containers' : '',
                showBorder: false,
                run(mode: QuickOpenMode): boolean {
                    if (mode !== QuickOpenMode.OPEN) {
                        return false;
                    }
                    handler(container.name);
                    return true;
                }
            })
        ));

        items.push(...toolingContainers.map((container, index) =>
            new QuickOpenGroupItem({
                label: container.name,
                groupLabel: devContainers.length <= 0 ? '' : index === 0 ? toolingContainers.length === 1 ? 'Tooling Container' : 'Tooling Containers' : '',
                showBorder: devContainers.length <= 0 ? false : index === 0 ? true : false,
                run(mode: QuickOpenMode): boolean {
                    if (mode !== QuickOpenMode.OPEN) {
                        return false;
                    }
                    handler(container.name);
                    return true;
                }
            })
        ));

        return items;
    }

    protected isDevContainer(entity: { name: string, container: cheApi.workspace.Machine }): boolean {
        const container = entity.container;
        return container.attributes !== undefined && (!container.attributes[CONTAINER_SOURCE_ATTRIBUTE] ||
            container.attributes[CONTAINER_SOURCE_ATTRIBUTE] === RECIPE_CONTAINER_SOURCE);
    }

    protected async getWorkspaceContainers(): Promise<{ name: string, container: cheApi.workspace.Machine }[]> {
        if (this.containers.length > 0) {
            return this.containers;
        }

        this.containers = [];
        try {
            const containersList = await this.cheApi.getCurrentWorkspacesContainers();
            for (const containerName in containersList) {
                if (!containersList.hasOwnProperty(containerName)) {
                    continue;
                }
                const container = { name: containerName, container: containersList[containerName] };
                this.containers.push(container);
            }
        } catch (e) {
            throw new Error('Unable to get list workspace containers. Cause: ' + e);
        }

        return this.containers;
    }

    getOptions(): QuickOpenOptions {
        return {
            placeholder: CONTAINERS_PLACE_HOLDER,
            fuzzyMatchLabel: true,
            fuzzyMatchDescription: true,
            fuzzySort: false
        };
    }

    onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
        acceptor(this.items);
    }

    getModel(): QuickOpenModel {
        return this;
    }
}
