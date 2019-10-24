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
            containerNames = await this.cheWorkspaceClient.getContainersNames();
        }

        if (containerNames.length === 1) {
            return Promise.resolve(containerNames[0]);
        }
        return this.showMachineQuickPick(containerNames);
    }

    private showMachineQuickPick(items: string[]): Promise<string> {
        return new Promise<string>(resolve => {

            const options = { placeHolder: CONTAINERS_PLACE_HOLDER } as theia.QuickPickOptions;
            options.onDidSelectItem = (item => {
                const machineName = typeof item === 'string' ? item : item.label;
                resolve(machineName);
            });
            theia.window.showQuickPick(items, options);
        });
    }
}
