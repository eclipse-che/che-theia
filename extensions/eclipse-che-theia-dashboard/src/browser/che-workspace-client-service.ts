/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { inject, injectable } from 'inversify';
import WorkspaceClient, { IRemoteAPI, IBackend } from '@eclipse-che/workspace-client';
import { EnvVariablesServer, EnvVariable } from '@theia/core/lib/common/env-variables';

@injectable()
export class CheWorkspaceClientService {

    private cheApi: Promise<string>;
    private _backend: IBackend;

    constructor(@inject(EnvVariablesServer) protected readonly baseEnvVariablesServer: EnvVariablesServer) {
        this.cheApi = this.baseEnvVariablesServer.getValue('CHE_API_EXTERNAL').then((cheApiEnv: EnvVariable | undefined) => {
            if (cheApiEnv && cheApiEnv.value) {
                return Promise.resolve(cheApiEnv.value);
            }
            return Promise.reject('Failed to get Eclipse CHE api endPoint');
        });
        this._backend = WorkspaceClient.getRestBackend();
    }

    async restClient(): Promise<IRemoteAPI> {
        const config = {
            baseUrl: await this.cheApi
        };
        return WorkspaceClient.getRestApi(config);
    }

    get backend(): IBackend {
        return this._backend;
    }
}
