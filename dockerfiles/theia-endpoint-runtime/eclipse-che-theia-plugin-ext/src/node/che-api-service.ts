/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheApiService } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';
import WorkspaceClient, { IRestAPIConfig, IRemoteAPI } from '@eclipse-che/workspace-client';
import { injectable } from 'inversify';

@injectable()
export class CheApiServiceImpl implements CheApiService {

    private workspaceRestAPI: IRemoteAPI | undefined;

    async currentWorkspace(): Promise<cheApi.workspace.Workspace> {
        try {
            const workspaceId = process.env.CHE_WORKSPACE_ID;
            if (!workspaceId) {
                return Promise.reject('Cannot find Che workspace id, environment variable "CHE_WORKSPACE_ID" is not set');
            }

            const wsClient = await this.wsClient();
            if (wsClient) {
                return await wsClient!.getById<cheApi.workspace.Workspace>(workspaceId);
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

            const wsClient = await this.wsClient();
            if (wsClient) {
                return await wsClient!.getById<cheApi.workspace.Workspace>(workspaceId);
            }

            return Promise.reject('Cannot create Che API REST Client');
        } catch (e) {
            console.log(e);
            return Promise.reject('Cannot create Che API REST Client');
        }
    }

    async updateWorkspace(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any> {
        try {
            if (!workspaceId) {
                return Promise.reject('Che Workspace id is not set');
            }

            const wsClient = await this.wsClient();
            if (wsClient) {
                return await wsClient!.update(workspaceId, workspace);
            }

            return Promise.reject('Cannot create Che API REST Client');
        } catch (e) {
            console.log(e);
            return Promise.reject('Cannot create Che API REST Client');
        }
    }

    async getFactoryById(factoryId: string): Promise<cheApi.factory.Factory> {
        try {
            const client = await this.wsClient();
            if (client) {
                return await client.getFactory<cheApi.factory.Factory>(factoryId);
            }

            return Promise.reject(`Unable to get factory with ID ${factoryId}`);
        } catch (e) {
            return Promise.reject('Unable to create Che API REST Client');
        }
    }

    private async wsClient(): Promise<IRemoteAPI | undefined> {
        const cheApiInternalVar = process.env.CHE_API_INTERNAL;
        const cheMachineToken = process.env.CHE_MACHINE_TOKEN;

        if (!cheApiInternalVar) {
            return undefined;
        }

        if (!this.workspaceRestAPI) {
            const restAPIConfig: IRestAPIConfig = {
                baseUrl: cheApiInternalVar,
                headers: {}
            };
            if (cheMachineToken) {
                restAPIConfig.headers['Authorization'] = 'Bearer ' + cheMachineToken;
            }

            this.workspaceRestAPI = await WorkspaceClient.getRestApi(restAPIConfig);
        }

        return this.workspaceRestAPI;
    }

}
