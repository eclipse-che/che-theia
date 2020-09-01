/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheApiService, Preferences, User, WorkspaceSettings } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';
import WorkspaceClient, { IRemoteAPI } from '@eclipse-che/workspace-client';
import { injectable } from 'inversify';
import { PUBLIC_CRT_PATH, SS_CRT_PATH } from './che-https';
import { TelemetryClient, EventProperty } from '@eclipse-che/workspace-telemetry-client';

@injectable()
export class CheApiServiceImpl implements CheApiService {

    private readonly telemetryClient: TelemetryClient | undefined;

    /**
     * Workspace client based variables.
     *
     * baseAPIUrl - responsible for storing base url to API service, taken from environment variable
     * machineToken - machine token taken from environment variable, always the same at workspace lifecycle
     * workspaceId - workspace ID taken from environment variable, always the same at workspace lifecycle
     */
    private readonly baseAPIUrl: string;
    private readonly machineToken: string;
    private readonly workspaceId: string;

    constructor() {
        if (process.env.CHE_API_INTERNAL === undefined) {
            throw new Error('Unable to create Che API REST Client: "CHE_API_INTERNAL" is not set.');
        } else {
            this.baseAPIUrl = process.env.CHE_API_INTERNAL;
        }

        if (process.env.CHE_MACHINE_TOKEN === undefined) {
            throw new Error('Machine token is not set.');
        } else {
            this.machineToken = process.env.CHE_MACHINE_TOKEN;
        }

        if (process.env.CHE_WORKSPACE_ID === undefined) {
            throw new Error('Environment variable CHE_WORKSPACE_ID is not set');
        } else {
            this.workspaceId = process.env.CHE_WORKSPACE_ID;
        }

        if (process.env.CHE_WORKSPACE_TELEMETRY_BACKEND_PORT === undefined) {
            console.error('Unable to create Che API REST Client: "CHE_WORKSPACE_TELEMETRY_BACKEND_PORT" is not set.');
        } else {
            this.telemetryClient = new TelemetryClient(undefined, 'http://localhost:' + process.env.CHE_WORKSPACE_TELEMETRY_BACKEND_PORT);
        }
    }

    getCurrentWorkspaceId(): string {
        return this.workspaceId;
    }

    getCheApiURI(): string {
        return this.baseAPIUrl;
    }

    async getUserId(userToken?: string): Promise<string> {
        const user = await this.updateAndGetRemoteAPI(userToken).getCurrentUser();
        return user.id;
    }

    getCurrentUser(userToken?: string): Promise<User> {
        return this.updateAndGetRemoteAPI(userToken).getCurrentUser();
    }

    getUserPreferences(filter?: string): Promise<Preferences> {
        return this.updateAndGetRemoteAPI().getUserPreferences(filter);
    }

    updateUserPreferences(update: Preferences): Promise<Preferences> {
        return this.updateAndGetRemoteAPI().updateUserPreferences(update);
    }

    replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
        return this.updateAndGetRemoteAPI().replaceUserPreferences(preferences);
    }

    deleteUserPreferences(list?: string[]): Promise<void> {
        return this.updateAndGetRemoteAPI().deleteUserPreferences(list);
    }

    getWorkspaceSettings(): Promise<WorkspaceSettings> {
        return this.updateAndGetRemoteAPI().getSettings();
    }

    currentWorkspace(): Promise<cheApi.workspace.Workspace> {
        return this.updateAndGetRemoteAPI().getById<cheApi.workspace.Workspace>(this.workspaceId);
    }

    getWorkspaceById(workspaceId: string): Promise<cheApi.workspace.Workspace> {
        return this.updateAndGetRemoteAPI().getById(this.workspaceId);
    }

    getAll(userToken?: string): Promise<cheApi.workspace.Workspace[]> {
        return this.updateAndGetRemoteAPI(userToken).getAll();
    }

    getAllByNamespace(namespace: string, userToken?: string): Promise<cheApi.workspace.Workspace[]> {
        return this.updateAndGetRemoteAPI(userToken).getAllByNamespace(namespace);
    }

    updateWorkspace(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<cheApi.workspace.Workspace> {
        return this.updateAndGetRemoteAPI().update(workspaceId, workspace);
    }

    updateWorkspaceActivity(): Promise<void> {
        return this.updateAndGetRemoteAPI().updateActivity(this.workspaceId);
    }

    stop(): Promise<void> {
        return this.updateAndGetRemoteAPI().stop(this.workspaceId);
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

    getFactoryById(factoryId: string): Promise<cheApi.factory.Factory> {
        return this.updateAndGetRemoteAPI().getFactory(factoryId);
    }

    generateSshKey(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        return this.updateAndGetRemoteAPI().generateSshKey(service, name);
    }

    createSshKey(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
        return this.updateAndGetRemoteAPI().createSshKey(sshKeyPair);
    }

    getSshKey(service: string, name: string): Promise<cheApi.ssh.SshPair> {
        return this.updateAndGetRemoteAPI().getSshKey(service, name);
    }

    getAllSshKey(service: string): Promise<cheApi.ssh.SshPair[]> {
        return this.updateAndGetRemoteAPI().getAllSshKey(service);
    }

    deleteSshKey(service: string, name: string): Promise<void> {
        return this.updateAndGetRemoteAPI().deleteSshKey(service, name);
    }

    async submitTelemetryEvent(id: string, ownerId: string, ip: string, agent: string, resolution: string, properties: [string, string][]): Promise<void> {
        if (this.telemetryClient === undefined) {
            return;
        }

        await this.telemetryClient.event({
            id: id,
            ip: ip,
            ownerId: ownerId,
            agent: agent,
            resolution: resolution,
            properties: properties.map((prop: [string, string]) => {
                const eventProp: EventProperty = {
                    id: prop[0],
                    value: prop[1]
                };
                return eventProp;
            })
        });
    }

    async submitTelemetryActivity(): Promise<void> {
        if (this.telemetryClient === undefined) {
            return;
        }
        await this.telemetryClient.activity();
    }

    getOAuthToken(oAuthProvider: string, userToken?: string): Promise<string | undefined> {
        return this.updateAndGetRemoteAPI(userToken).getOAuthToken(oAuthProvider);
    }

    getOAuthProviders(userToken?: string): Promise<string[]> {
        return this.updateAndGetRemoteAPI(userToken).getOAuthProviders();
    }

    private updateAndGetRemoteAPI(userToken?: string): IRemoteAPI {
        return WorkspaceClient.getRestApi({
            baseUrl: this.baseAPIUrl,
            ssCrtPath: SS_CRT_PATH,
            publicCrtPath: PUBLIC_CRT_PATH,
            machineToken: userToken && userToken.length > 0 ? undefined : this.machineToken,
            userToken: userToken && userToken.length > 0 ? userToken : undefined
        });
    }
}
