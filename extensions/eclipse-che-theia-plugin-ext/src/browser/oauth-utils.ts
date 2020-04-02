/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { inject, injectable } from 'inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { CheApiService } from '../common/che-protocol';
import { Emitter, Event } from '@theia/core/lib/common';

@injectable()
export class OauthUtils {

    private apiUrl: string;
    private machineToken: string | undefined;
    private oAuthPopup: Window | undefined;
    private userToken: string | undefined;
    private isMultiUser: boolean;
    private readonly event: Event<void>;
    constructor(@inject(EnvVariablesServer) private readonly envVariableServer: EnvVariablesServer,
                @inject(CheApiService) private readonly cheApiService: CheApiService) {
        const eventEmitter = new Emitter<void>();
        this.event = eventEmitter.event;
        this.envVariableServer.getValue('CHE_API').then(variable => {
            if (variable && variable.value) {
                this.apiUrl = variable.value;
            }
        });
        this.envVariableServer.getValue('CHE_MACHINE_TOKEN').then(variable => {
            if (variable && variable.value) {
                this.machineToken = variable.value;
            }
        });
        this.envVariableServer.getValue('KEYCLOAK_SERVICE_HOST').then(variable => {
            if (variable && variable.value && variable.value.length > 0) {
                this.isMultiUser = true;
            }
        });
        window.addEventListener('message', data => {
            if (data.data.startsWith('token:') && this.oAuthPopup) {
                this.oAuthPopup.close();
                this.userToken = data.data.substring(6, data.data.length);
                eventEmitter.fire(undefined);
            } else if (data.data.startsWith('status:') && this.oAuthPopup) {
                this.oAuthPopup.postMessage('token:' + (this.machineToken ? this.machineToken : ''), '*');
            }
        });
    }

    async getUserToken(): Promise<string | undefined> {
        if (this.userToken) {
            return new Promise(async resolve => resolve(this.userToken));
        } else if (this.isMultiUser) {
            const popup = window.open(`${this.apiUrl.substring(0, this.apiUrl.indexOf('/api'))}/_app/oauth.html`, 'popup');
            if (popup) {
                this.oAuthPopup = popup;
            }
            return new Promise(async resolve => {
                this.event(() => resolve(this.userToken));
            });
        }
    }

    async getToken(oAuthProvider: string): Promise<string | undefined> {
        return await this.cheApiService.getOAuthToken(oAuthProvider, await this.getUserToken());
    }

    async getProviders(): Promise<string[]> {
        return await this.cheApiService.getOAuthProviders(await this.getUserToken());
    }

    async isAuthenticated(provider: string): Promise<boolean> {
        const token = await this.cheApiService.getOAuthToken(provider, await this.getUserToken());
        return token !== null;
    }

    authenticate(oauthProvider: string, scope?: string[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const redirectUrl = window.location.href;
            let url = `${this.apiUrl.substring(0, this.apiUrl.indexOf('/api'))}/_app/oauth.html?oauth_provider=${oauthProvider}`;
            if (scope) {
                for (const s of scope) {
                    url += `&scope=${s}`;
                }
            }
            url += `&redirect_after_login=${redirectUrl}`;
            const popup = window.open(url, 'popup');
            if (popup) {
                this.oAuthPopup = popup;
            }
            this.event(() => resolve(undefined));
        });
    }
}
