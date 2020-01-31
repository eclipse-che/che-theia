/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { CheApiService, CheGithubMain } from '../common/che-protocol';
import { interfaces } from 'inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import axios, { AxiosInstance } from 'axios';

export class CheGithubMainImpl implements CheGithubMain {
    private readonly envVariableServer: EnvVariablesServer;
    private axiosInstance: AxiosInstance = axios;
    private apiUrl: string;
    private token: string | undefined;
    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.envVariableServer = container.get(EnvVariablesServer);
        this.cheApiService = container.get(CheApiService);
        this.envVariableServer.getValue('CHE_API').then(variable => {
            if (variable && variable.value) {
                this.apiUrl = variable.value;
            }
        });
    }

    async $uploadPublicSshKey(publicKey: string): Promise<void> {
        await this.fetchToken();
        await this.axiosInstance.post('https://api.github.com/user/keys?access_token=' + this.token, {
            title: 'che-theia',
            key: publicKey
        });
    }

    async $getToken(): Promise<string> {
        await this.fetchToken();
        if (this.token) {
            return this.token;
        } else {
            throw new Error('Failed to get GitHub authentication token');
        }
    }

    private async fetchToken(): Promise<void> {
        if (!this.token) {
            await this.updateToken();
        } else {
            try {
                await this.axiosInstance.get('https://api.github.com/user?access_token=' + this.token);
            } catch (e) {
                await this.updateToken();
            }
        }
    }

    private async updateToken(): Promise<void> {
        this.token = await this.cheApiService.getOAuthToken('github');
        if (!this.token) {
            await this.authenticate();
            this.token = await this.cheApiService.getOAuthToken('github');
        }
    }

    private authenticate(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const redirectUrl = window.location.href;
            const url = `${this.apiUrl}/oauth/authenticate?oauth_provider=github&userId=${await this.cheApiService.getUserId()}` +
                `&scope=write:public_key&redirect_after_login=${redirectUrl}`;
            const popupWindow = window.open(url, 'popup');
            const popup_close_handler = async () => {
                if (!popupWindow || popupWindow.closed) {
                    if (popupCloseHandlerIntervalId) {
                        window.clearInterval(popupCloseHandlerIntervalId);
                    }
                    reject(new Error('Github authentication failed!'));
                } else {
                    try {
                        if (redirectUrl === popupWindow.location.href) {
                            if (popupCloseHandlerIntervalId) {
                                window.clearInterval(popupCloseHandlerIntervalId);
                            }
                            popupWindow.close();
                            resolve();
                        }
                    } catch (error) {
                    }
                }
            };

            const popupCloseHandlerIntervalId = window.setInterval(popup_close_handler, 80);
        });
    }
}
