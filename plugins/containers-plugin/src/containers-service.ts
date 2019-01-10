/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';

export interface IWorkspaceMachine {
    machineName: string;
    servers?: {
        [serverRef: string]: {
            url?: string;
            port?: string;
        }
    };
    status?: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
}

export class ContainersService {

    private runtimeMachines: Array<IWorkspaceMachine> = [];

    constructor() {
    }

    async updateMachines(): Promise<void> {
        const workspace = await che.workspace.getCurrentWorkspace();
        if (!workspace) {
            return Promise.reject('Failed to get workspace configuration');
        }

        const workspaceMachines = workspace!.runtime
            && workspace!.runtime!.machines
            || workspace!.config!.environments![workspace.config!.defaultEnv!].machines
            || {};

        this.runtimeMachines.length = 0;

        Object.keys(workspaceMachines).forEach((machineName: string) => {
            const machine = <IWorkspaceMachine>workspaceMachines[machineName];
            machine.machineName = machineName;
            this.runtimeMachines.push(machine);
        });
    }

    get machines(): Array<IWorkspaceMachine> {
        return this.runtimeMachines;
    }
}
