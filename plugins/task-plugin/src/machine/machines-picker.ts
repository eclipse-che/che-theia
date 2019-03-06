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
import { CheWorkspaceClient } from '../che-workspace/che-workspace-client';

const MACHINES_PLACE_HOLDER = 'Pick a machine to run the task';

@injectable()
export class MachinesPicker {

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    /**
     * Returns a machine name if there's just one machine in the current workspace.
     * Shows a quick open widget allows to pick a machine if there are several ones.
     */
    async pick(): Promise<string> {
        const machines = await this.getMachines();
        if (machines.length === 1) {
            return Promise.resolve(machines[0]);
        }

        const items: string[] = [];
        for (const machineName of machines) {
            items.push(machineName);
        }

        return this.showMachineQuickPick(items);
    }

    protected async getMachines(): Promise<string[]> {
        const machineNames: string[] = [];
        const machines = await this.cheWorkspaceClient.getMachines();
        if (!machines) {
            return machineNames;
        }

        for (const machineName in machines) {
            if (machines.hasOwnProperty(machineName)) {
                machineNames.push(machineName);
            }
        }
        return machineNames;
    }

    private showMachineQuickPick(items: string[]): Promise<string> {
        return new Promise<string>(resolve => {

            const options = { placeHolder: MACHINES_PLACE_HOLDER } as theia.QuickPickOptions;
            options.onDidSelectItem = (item => {
                const machineName = typeof item === 'string' ? item : item.label;
                resolve(machineName);
            });
            theia.window.showQuickPick(items, options);
        });
    }
}
