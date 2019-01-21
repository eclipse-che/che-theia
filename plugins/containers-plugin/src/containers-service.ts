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

export interface IContainer {
    name: string;
    isDev: boolean;
    status?: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
    servers?: {
        [serverRef: string]: {
            url?: string;
        }
    };
}

const MAX_FAILED_ATTEMPTS = 5;

export class ContainersService {
    private _containers: Array<IContainer>;

    constructor() {
        this._containers = [];
    }

    async updateContainers(failAttempts: number = 0): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 500));
        let workspace = await che.workspace.getCurrentWorkspace();
        if (!workspace) {
            failAttempts++;
            if (failAttempts < MAX_FAILED_ATTEMPTS) {
                return this.updateContainers(failAttempts);
            }
            return Promise.reject('Failed to get workspace configuration');
        }
        const devMachines = workspace!.config!.environments![workspace!.config!.defaultEnv!].machines || {};
        const machines = workspace!.runtime && workspace!.runtime!.machines || {};
        this._containers.length = 0;
        Object.keys(machines).forEach((name: string) => {
            const machine = machines[name];
            const container: IContainer = {
                name: name,
                status: machine.status,
                isDev: devMachines[name] !== undefined
            };
            if (machine && machine.servers) {
                container.servers = {};
                Object.keys(machine.servers).forEach((serverName: string) => {
                    const server = machine!.servers![serverName]!;
                    if (server && server.url) {
                        container!.servers![serverName] = { url: server!.url };
                    }
                });
            }
            this._containers.push(container);
        });
    }

    get containers(): Array<IContainer> {
        return this._containers;
    }
}
