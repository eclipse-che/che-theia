/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import WorkspaceClient, { IRemoteAPI, IRestAPIConfig } from '@eclipse-che/workspace-client';
import { che } from '@eclipse-che/api';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { CHEWorkspaceService, WorkspaceContainer } from '../common/workspace-service';
import { TERMINAL_SERVER_TYPE } from '../browser/server-definition/remote-terminal-protocol';

const TYPE: string = 'type';
const EDITOR_SERVER_TYPE: string = 'ide';
const SS_CRT_PATH = '/tmp/che/secret/ca.crt';

@injectable()
export class CHEWorkspaceServiceImpl implements CHEWorkspaceService {

    private api: IRemoteAPI | undefined;

    constructor(@inject(EnvVariablesServer) protected readonly baseEnvVariablesServer: EnvVariablesServer) {
    }

    public async getContainerList(): Promise<WorkspaceContainer[]> {
        const containers: WorkspaceContainer[] = [];
        try {
            const workspaceId = this.getWorkspaceId();
            const restClient = this.getRemoteApi();
            if (!workspaceId || !restClient) {
                throw new Error('Unable to use workspace client.');
            }

            const workspace = await restClient.getById<che.workspace.Workspace>(workspaceId);

            if (workspace.runtime && workspace.runtime.machines) {
                const machines = workspace.runtime.machines;
                for (const machineName in machines) {
                    if (!machines.hasOwnProperty(machineName)) {
                        continue;
                    }
                    const machine = workspace.runtime.machines[machineName];
                    const container: WorkspaceContainer = { name: machineName, ...machine };
                    containers.push(container);
                }
            }
        } catch (e) {
            throw new Error('Unable to get list workspace containers. Cause: ' + e);
        }

        return containers;
    }

    public async findTerminalServer(): Promise<che.workspace.Server | undefined> {
        const containers = await this.getContainerList();

        for (const container of containers) {
            const servers = container.servers || {};
            for (const serverName in servers) {
                if (!servers.hasOwnProperty(serverName)) {
                    continue;
                }
                const attrs = servers[serverName].attributes || {};

                for (const attrName in attrs) {
                    if (attrName === TYPE && attrs[attrName] === TERMINAL_SERVER_TYPE) {
                        return servers[serverName];
                    }
                }
            }
        }

        return undefined;
    }

    public async findEditorMachineName(): Promise<string | undefined> {
        const containers = await this.getContainerList();

        for (const container of containers) {
            const servers = container.servers || {};
            for (const serverName in servers) {
                if (!servers.hasOwnProperty(serverName)) {
                    continue;
                }
                const attrs = servers[serverName].attributes || {};
                for (const attrName in attrs) {
                    if (attrName === TYPE && attrs[attrName] === EDITOR_SERVER_TYPE) {
                        return container.name;
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
            restConfig.ssCrtPath = SS_CRT_PATH;

            this.api = WorkspaceClient.getRestApi(restConfig);
        }
        return this.api;
    }
}
