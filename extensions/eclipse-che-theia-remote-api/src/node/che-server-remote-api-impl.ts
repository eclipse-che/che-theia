/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import WorkspaceClient, { IRemoteAPI } from '@eclipse-che/workspace-client';
import { injectable } from 'inversify';
import { PUBLIC_CRT_PATH, SS_CRT_PATH } from './che-server-https';

/**
 * Should be only injected by the classes inside this package.
 */
@injectable()
export class CheServerRemoteApiImpl {

    /**
     * Workspace client based variables.
     *
     * baseAPIUrl - responsible for storing base url to API service, taken from environment variable
     * machineToken - machine token taken from environment variable, always the same at workspace lifecycle
     */
    private readonly baseAPIUrl: string;
    private readonly machineToken: string;

    constructor() {
        if (process.env.CHE_API_INTERNAL === undefined) {
            console.error('Unable to create Che API REST Client: "CHE_API_INTERNAL" is not set.');
        } else {
            this.baseAPIUrl = process.env.CHE_API_INTERNAL;
        }

        if (process.env.CHE_MACHINE_TOKEN === undefined) {
            console.error('Machine token is not set.');
        } else {
            this.machineToken = process.env.CHE_MACHINE_TOKEN;
        }
    }

    public getAPI(userToken?: string): IRemoteAPI {
        return WorkspaceClient.getRestApi({
            baseUrl: this.baseAPIUrl,
            ssCrtPath: SS_CRT_PATH,
            publicCrtPath: PUBLIC_CRT_PATH,
            machineToken: userToken && userToken.length > 0 ? undefined : this.machineToken,
            userToken: userToken && userToken.length > 0 ? userToken : undefined
        });
    }

    getCheApiURI(): string {
        return this.baseAPIUrl;
    }
}
