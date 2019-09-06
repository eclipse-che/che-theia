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
    env?: { [key: string]: string; },
    volumes?: {
        [key: string]: {
            path?: string;
        };
    },
    commands?: { commandName: string, commandLine: string }[]
}

enum ContainerType {
    TOOL = 'tool',
    USER_DEFINED = 'recipe'
}

const MAX_FAILED_ATTEMPTS = 5;

export class ContainersService {
    private _containers: Array<IContainer>;

    constructor() {
        this._containers = [];
    }

    async updateContainers(failAttempts: number = 0): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 500));
        const workspace = await che.workspace.getCurrentWorkspace();
        if (!workspace) {
            failAttempts++;
            if (failAttempts < MAX_FAILED_ATTEMPTS) {
                return this.updateContainers(failAttempts);
            }
            return Promise.reject('Failed to get workspace configuration');
        }

        const runtime = workspace.runtime;
        if (!runtime) {
            // this code runs inside workspace, so should never happen
            throw new Error('Workspace is not running');
        }

        const machines = runtime.machines || {};
        this._containers.length = 0;
        Object.keys(machines).forEach((name: string) => {
            const machine = machines[name];
            let userDefinedContainer = true;
            if (machine.attributes && machine.attributes.source) {
                userDefinedContainer = machine.attributes.source === ContainerType.USER_DEFINED;
            }

            const container: IContainer = {
                name: name,
                status: machine.status,
                isDev: userDefinedContainer
            };
            // TODO rework to use runtime only and do not read static config when appropriate changes added to Che server side.
            if (container.isDev) {
                if (workspace.devfile) {
                    // For now we cannot retreive needed information without very complicated analyzation,
                    // which is not client side task. See the comment above.
                    container.volumes = {};
                    container.env = {};
                } else if (workspace.config) {
                    const machinesConfig = workspace.config.environments[workspace.config.defaultEnv].machines;
                    container.volumes = machinesConfig[name].volumes;
                    container.env = machinesConfig[name].env;
                } else {
                    // should never happen
                    throw new Error('Invalid workspace structure');
                }
            }
            if (runtime.commands) {
                container.commands = [];
                const cheCommands = runtime.commands.filter(command => command.type === 'exec');
                cheCommands.forEach(command => {
                    if (command.attributes && command.attributes.machineName && command.attributes.machineName !== name) {
                        return;
                    }
                    container.commands.push({ commandName: command.name, commandLine: command.commandLine });
                });
            }
            if (machine && machine.servers) {
                container.servers = {};
                Object.keys(machine.servers).forEach((serverName: string) => {
                    const server = machine.servers[serverName];
                    if (server && server.url) {
                        container.servers[serverName] = { url: server.url };
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
