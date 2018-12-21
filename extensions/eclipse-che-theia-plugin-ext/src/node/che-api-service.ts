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
import { Workspace, Factory } from '@eclipse-che/plugin';
import WorkspaceClient, { IRestAPIConfig, IRemoteAPI } from '@eclipse-che/workspace-client';
import { injectable } from 'inversify';

@injectable()
export class CheApiServiceImpl implements CheApiService {

    private workspaceRestAPI: IRemoteAPI | undefined;

    async currentWorkspace(): Promise<Workspace> {
        try {

            const cheWorkspaceId = process.env.CHE_WORKSPACE_ID;
            if (!cheWorkspaceId) {
                return Promise.reject('Cannot find Che workspace id, environment variable "CHE_WORKSPACE_ID" is not set');
            }
            const wsClient = await this.wsClient();
            if (wsClient) {
                return await wsClient!.getById<Workspace>(cheWorkspaceId);
            }
            return Promise.reject('Cannot create Che API REST Client');
        } catch (e) {
            console.log(e);
            return Promise.reject('Cannot create Che API REST Client');
        }
    }

    async getFactoryById(factoryId: string): Promise<Factory> {
        try {
            const client = await this.wsClient();
            if (client) {
                return await client.getFactory<Factory>(factoryId);
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
