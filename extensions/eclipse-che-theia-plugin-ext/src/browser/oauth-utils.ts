/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { interfaces } from 'inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { CheApiService } from '../common/che-protocol';

export class OauthUtils {
    private readonly envVariableServer: EnvVariablesServer;
    private apiUrl: string;
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

    async getToken(oAuthProvider: string): Promise<string | undefined> {
        return await this.cheApiService.getOAuthToken(oAuthProvider);
    }

    authenticate(oauthProvider: string, scope?: string[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const redirectUrl = window.location.href;
            let url = `${this.apiUrl}/oauth/authenticate?oauth_provider=${oauthProvider}&userId=${await this.cheApiService.getUserId()}` +
                `&redirect_after_login=${redirectUrl}`;
            if (scope) {
                for (const s of scope) {
                    url = url.concat(`&scope=${s}`);
                }
            }
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
