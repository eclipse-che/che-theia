/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

const TERMINAL_SERVER_TYPE = 'terminal';

export const RECIPE_CONTAINER_SOURCE = 'recipe';
export const CONTAINER_SOURCE_ATTRIBUTE = 'source';

export interface WorkspaceContainer extends cheApi.workspace.Machine {
    name: string
}

@injectable()
export class CheWorkspaceClient {

    /** Returns 'key -> url' map of links for the current workspace. */
    async getLinks(): Promise<{ [key: string]: string } | undefined> {
        const workspace = await this.getCurrentWorkspace();
        return workspace.links;
    }

    /** Returns array of containers' names for the current workspace. */
    async getContainersNames(): Promise<string[]> {
        const containerNames: string[] = [];

        try {
            const containers = await this.getMachines();
            for (const containerName in containers) {
                if (containers.hasOwnProperty(containerName)) {
                    containerNames.push(containerName);
                }
            }
        } catch (error) {
        } finally {
            return containerNames;
        }
    }

    async getMachines(): Promise<{ [attrName: string]: cheApi.workspace.Machine }> {
        const workspace = await this.getCurrentWorkspace();
        const runtime = workspace.runtime;
        if (!runtime) {
            throw new Error('Workspace is not running.');
        }

        const machines = runtime.machines;
        if (!machines) {
            throw new Error('No machines for current workspace is found.');
        }
        return machines;
    }

    async getContainers(): Promise<WorkspaceContainer[]> {
        const containers: WorkspaceContainer[] = [];
        try {
            const workspace = await this.getCurrentWorkspace();

            if (workspace.runtime && workspace.runtime.machines) {
                const machines = workspace.runtime.machines;
                for (const machineName in machines) {
                    if (!machines.hasOwnProperty(machineName)) {
                        continue;
                    }
                    const container: WorkspaceContainer = { name: machineName, ...machines[machineName] };
                    containers.push(container);
                }
            }
        } catch (e) {
            throw new Error('Unable to get list workspace containers. Cause: ' + e);
        }

        return containers;
    }

    async getCommands(): Promise<cheApi.workspace.Command[]> {
        const workspace: cheApi.workspace.Workspace = await this.getCurrentWorkspace();

        const runtime: cheApi.workspace.Runtime | undefined = workspace.runtime;
        if (!runtime) {
            return [];
        }

        const commands = runtime.commands;
        return commands ? commands : [];
    }

    getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
        return che.workspace.getCurrentWorkspace();
    }

    async getWorkspaceId(): Promise<string | undefined> {
        const workspace = await this.getCurrentWorkspace();
        return workspace.id;
    }

    async getMachineExecServerURL(): Promise<string> {
        const machineExecServer = await this.getMachineExecServer();
        if (!machineExecServer) {
            throw new Error(`No server with type ${TERMINAL_SERVER_TYPE} found.`);
        }
        return machineExecServer.url!;
    }

    protected async getMachineExecServer(): Promise<cheApi.workspace.Server | undefined> {
        const machines = await this.getMachines();
        for (const machineName in machines) {
            if (!machines.hasOwnProperty(machineName)) {
                continue;
            }
            const servers = machines[machineName].servers!;
            for (const serverName in servers) {
                if (!servers.hasOwnProperty(serverName)) {
                    continue;
                }

                const serverAttributes = servers[serverName].attributes;
                if (serverAttributes && serverAttributes['type'] === TERMINAL_SERVER_TYPE) {
                    return servers[serverName];
                }
            }
        }
        return undefined;
    }
}
