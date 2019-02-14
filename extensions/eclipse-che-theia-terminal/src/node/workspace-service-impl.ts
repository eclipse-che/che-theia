/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import WorkspaceClient, { IRemoteAPI, IRequestError, IRestAPIConfig } from '@eclipse-che/workspace-client';
import { che } from '@eclipse-che/api';
import { CHEWorkspaceService } from '../common/workspace-service';
import { TERMINAL_SERVER_TYPE } from '../browser/server-definition/remote-terminal-protocol';

const TYPE: string = 'type';
const EDITOR_SERVER_TYPE: string = 'ide';

@injectable()
export class CHEWorkspaceServiceImpl implements CHEWorkspaceService {

    private api: IRemoteAPI | undefined;

    public async getMachineList(): Promise<{ [attrName: string]: che.workspace.Machine }> {
        const machineNames: { [attrName: string]: che.workspace.Machine } = {};
        const workspaceId = this.getWorkspaceId();
        const restClient = this.getRemoteApi();
        if (!workspaceId || !restClient) {
            return machineNames;
        }
        return new Promise<{ [attrName: string]: che.workspace.Machine }>((resolve, reject) => {
            restClient.getById<che.workspace.Workspace>(workspaceId)
                .then((workspace: che.workspace.Workspace) => {
                    if (workspace.runtime) {
                        resolve(workspace.runtime.machines);
                        return;
                    }
                    resolve({});
                })
                .catch((reason: IRequestError) => {
                    console.log(`Failed to get workspace by ID: ${workspaceId}. Status code: ${reason.status}`);
                    reject(reason.message);
                });
        });
    }

    public async findTerminalServer(): Promise<che.workspace.Server | undefined> {
        const machines = await this.getMachineList();

        for (const machineName in machines) {
            if (!machines.hasOwnProperty(machineName)) {
                continue;
            }
            const machine = machines[machineName];
            if (machine) {
                const servers = machine.servers!;
                for (const serverName in servers) {
                    if (!servers.hasOwnProperty(serverName)) {
                        continue;
                    }
                    const attrs = servers[serverName].attributes;
                    if (attrs) {
                        for (const attrName in attrs) {
                            if (attrName === TYPE && attrs[attrName] === TERMINAL_SERVER_TYPE) {
                                return servers[serverName];
                            }
                        }
                    }
                }
            }

        }

        return undefined;
    }

    public async findEditorMachineName(): Promise<string | undefined> {
        const machines = await this.getMachineList();

        for (const machineName in machines) {
            if (!machines.hasOwnProperty(machineName)) {
                continue;
            }
            const machine = machines[machineName];
            if (machine) {
                const servers = machine.servers!;
                for (const serverName in servers) {
                    if (!servers.hasOwnProperty(serverName)) {
                        continue;
                    }
                    const attrs = servers[serverName].attributes;
                    if (attrs) {
                        for (const attrName in attrs) {
                            if (attrName === TYPE && attrs[attrName] === EDITOR_SERVER_TYPE) {
                                return machineName;
                            }
                        }
                    }
                }
            }
        }

        return undefined;
    }

    private getWorkspaceId(): string | undefined {
        return process.env['CHE_WORKSPACE_ID'];
    }

    private getWsMasterApiEndPoint(): string | undefined {
        return process.env['CHE_API_EXTERNAL'];
    }

    private getMachineToken(): string | undefined {
        return process.env['CHE_MACHINE_TOKEN'];
    }

    private getRemoteApi(): IRemoteAPI {
        if (!this.api) {
            const machineToken = this.getMachineToken();
            const baseUrl = this.getWsMasterApiEndPoint();
            const restConfig: IRestAPIConfig = { baseUrl: baseUrl, headers: {} };

            if (machineToken) {
                restConfig.headers['Authorization'] = 'Bearer ' + machineToken;
            }

            this.api = WorkspaceClient.getRestApi(restConfig);
        }
        return this.api;
    }
}
