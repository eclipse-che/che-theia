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
    status?: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
    servers?: {
        [serverRef: string]: {
            url?: string;
        }
    };
}

export class ContainersService {
    private _containers: Array<IContainer>;

    constructor() {
        this._containers = [];
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

        this._containers.length = 0;
        Object.keys(workspaceMachines).forEach((machineName: string) => {
            const machine = <{
                servers?: {
                    [serverRef: string]: { url?: string; }
                },
                status?: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
            }>workspaceMachines[machineName];
            const container: IContainer = {
                name: machineName,
                status: machine.status
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
