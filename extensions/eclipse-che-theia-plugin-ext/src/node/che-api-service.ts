/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheApiService, Preferences, WorkspaceSettings } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';
import WorkspaceClient, { IRestAPIConfig, IRemoteAPI } from '@eclipse-che/workspace-client';
import { injectable } from 'inversify';
import { SS_CRT_PATH } from './che-https';

const ENV_WORKSPACE_ID_IS_NOT_SET = 'Environment variable CHE_WORKSPACE_ID is not set';

@injectable()
export class CheApiServiceImpl implements CheApiService {

    private workspaceRestAPI: IRemoteAPI | undefined;

    async getCurrentWorkspaceId(): Promise<string> {
        return this.getWorkspaceIdFromEnv();
    }

    async getCheApiURI(): Promise<string | undefined> {
        return process.env.CHE_API_INTERNAL;
    }

    async getUserPreferences(filter?: string): Promise<Preferences> {
        const cheApiClient = await this.getCheApiClient();
        return cheApiClient.getUserPreferences(filter);
    }

    async updateUserPreferences(update: Preferences): Promise<Preferences> {
        const cheApiClient = await this.getCheApiClient();
        return cheApiClient.updateUserPreferences(update);
    }

    async replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
        const cheApiClient = await this.getCheApiClient();
        return cheApiClient.replaceUserPreferences(preferences);
    }

    async deleteUserPreferences(list?: string[]): Promise<void> {
        const cheApiClient = await this.getCheApiClient();
        return cheApiClient.deleteUserPreferences(list);
    }

    async getWorkspaceSettings(): Promise<WorkspaceSettings> {
        const cheApiClient = await this.getCheApiClient();
        return cheApiClient.getSettings();
    }

    async currentWorkspace(): Promise<cheApi.workspace.Workspace> {
        try {
            const workspaceId = process.env.CHE_WORKSPACE_ID;
            if (!workspaceId) {
                return Promise.reject(ENV_WORKSPACE_ID_IS_NOT_SET);
            }

            const cheApiClient = await this.getCheApiClient();
            if (cheApiClient) {
                return await cheApiClient.getById<cheApi.workspace.Workspace>(workspaceId);
            }

            return Promise.reject('Cannot create Che API REST Client');
        } catch (e) {
            console.log(e);
            return Promise.reject('Cannot create Che API REST Client');
        }
    }

    async getWorkspaceById(workspaceId: string): Promise<cheApi.workspace.Workspace> {
        try {
            if (!workspaceId) {
                return Promise.reject('Che Workspace id is not set');
            }

            const cheApiClient = await this.getCheApiClient();
            if (cheApiClient) {
                return await cheApiClient.getById<cheApi.workspace.Workspace>(workspaceId);
            }

            return Promise.reject('Cannot create Che API REST Client');
        } catch (e) {
            console.log(e);
            return Promise.reject('Cannot create Che API REST Client');
        }
    }

    async updateWorkspace(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<cheApi.workspace.Workspace> {
        try {
            if (!workspaceId) {
                return Promise.reject('Che Workspace id is not set');
            }

            const cheApiClient = await this.getCheApiClient();
            if (cheApiClient) {
                return await cheApiClient.update(workspaceId, workspace);
            }

            return Promise.reject('Cannot create Che API REST Client');
        } catch (e) {
            console.log(e);
            return Promise.reject('Cannot create Che API REST Client');
        }
    }

    async stop(): Promise<void> {
        const workspaceId = process.env.CHE_WORKSPACE_ID;
        if (!workspaceId) {
            return Promise.reject(ENV_WORKSPACE_ID_IS_NOT_SET);
        }

        const cheApiClient = await this.getCheApiClient();
        return await cheApiClient.stop(workspaceId);
    }

    async getCurrentWorkspacesContainers(): Promise<{ [key: string]: cheApi.workspace.Machine }> {
        const result: { [key: string]: cheApi.workspace.Machine } = {};
        try {
            const workspace = await this.currentWorkspace();
            const containers = workspace.runtime!.machines;
            if (containers) {
                for (const containerName of Object.keys(containers)) {
                    const container = containers[containerName];
                    if (container) {
                        result[containerName] = container;
                    }
                }
            }
        } catch (e) {
            throw new Error(`Unable to get workspace containers. Cause: ${e}`);
        }
        return result;
    }

    async findUniqueServerByAttribute(attributeName: string, attributeValue: string): Promise<cheApi.workspace.Server> {
        const containers = await this.getCurrentWorkspacesContainers();
        try {
            if (containers) {
                for (const containerName of Object.keys(containers)) {
                    const servers = containers[containerName].servers;
                    if (servers) {
                        for (const serverName of Object.keys(servers)) {
                            const server = servers[serverName];
                            if (server && server.attributes && server.attributes[attributeName] === attributeValue) {
                                return server;
                            }
                        }
                    }
                }
            }
            return Promise.reject(`Server by attributes '${attributeName}'='${attributeValue}' was not found.`);
        } catch (e) {
            return Promise.reject(`Unable to get workspace servers. Cause: ${e}`);
        }
    }

    async getFactoryById(factoryId: string): Promise<cheApi.factory.Factory> {
        try {
            const client = await this.getCheApiClient();
            if (client) {
                return await client.getFactory<cheApi.factory.Factory>(factoryId);
            }

            return Promise.reject(`Unable to get factory with ID ${factoryId}`);
        } catch (e) {
            return Promise.reject('Unable to create Che API REST Client');
        }
    }

    async generateSshKey(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        try {
            const client = await this.getCheApiClient();
            if (client) {
                return client.generateSshKey(service, name);
            }

            throw new Error(`Unable to generate SSH Key for ${service}:${name}`);
        } catch (e) {
            console.error(e);
            throw new Error(e);
        }
    }

    async createSshKey(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
        try {
            const client = await this.getCheApiClient();
            if (client) {
                return client.createSshKey(sshKeyPair);
            }

            throw new Error('Unable to create SSH Key');
        } catch (e) {
            console.error(e);
            throw new Error(e);
        }
    }

    async getSshKey(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        try {
            const client = await this.getCheApiClient();
            if (client) {
                return await client.getSshKey(service, name);
            }

            throw new Error(`Unable to get SSH Key for ${service}:${name}`);
        } catch (e) {
            console.error(e);
            throw new Error(e);
        }
    }

    async getAllSshKey(service: string): Promise<cheApi.ssh.SshPair[]> {
        try {
            const client = await this.getCheApiClient();
            if (client) {
                return client.getAllSshKey(service);
            }
            throw new Error(`Unable to get SSH Keys for ${service}`);
        } catch (e) {
            console.error(e);
            throw new Error(e);
        }
    }

    async deleteSshKey(service: string, name: string): Promise<void> {
        try {
            const client = await this.getCheApiClient();
            if (client) {
                return client.deleteSshKey(service, name);
            }
            throw new Error(`Unable to delete SSH Key for ${service}:${name}`);
        } catch (e) {
            console.error(e);
            throw new Error(e);
        }
    }

    private async getCheApiClient(): Promise<IRemoteAPI> {
        const cheApiInternalVar = process.env.CHE_API_INTERNAL;
        const cheMachineToken = process.env.CHE_MACHINE_TOKEN;

        if (!cheApiInternalVar) {
            return Promise.reject('Unable to create Che API REST Client: "CHE_API_INTERNAL" is not set.');
        }

        if (!this.workspaceRestAPI) {
            const restAPIConfig: IRestAPIConfig = {
                baseUrl: cheApiInternalVar,
                headers: {}
            };
            if (cheMachineToken) {
                restAPIConfig.headers['Authorization'] = 'Bearer ' + cheMachineToken;
            }
            restAPIConfig.ssCrtPath = SS_CRT_PATH;

            this.workspaceRestAPI = await WorkspaceClient.getRestApi(restAPIConfig);
        }

        return this.workspaceRestAPI;
    }

    private getWorkspaceIdFromEnv(): string {
        const workspaceId = process.env.CHE_WORKSPACE_ID;
        if (!workspaceId) {
            throw new Error(ENV_WORKSPACE_ID_IS_NOT_SET);
        }

        return workspaceId;
    }

}
