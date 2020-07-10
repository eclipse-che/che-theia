/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { CheOpenshiftMain } from '../common/che-protocol';
import { interfaces } from 'inversify';
import { OauthUtils } from './oauth-utils';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import axios, { AxiosInstance } from 'axios';

export class CheOpenshiftMainImpl implements CheOpenshiftMain {
    private readonly oAuthUtils: OauthUtils;
    private isMultiUser: boolean;
    private isHostedChe: boolean;
    private axiosInstance: AxiosInstance = axios;

    constructor(container: interfaces.Container) {
        this.oAuthUtils = container.get(OauthUtils);
        const envVariablesServer = container.get<EnvVariablesServer>(EnvVariablesServer);
        envVariablesServer.getValue('CHE_MACHINE_TOKEN').then(variable => {
            if (variable && variable.value && variable.value.length > 0) {
                this.isMultiUser = true;
            }
        });
        envVariablesServer.getValue('CHE_API').then(variable => {
            if (variable && variable.value && variable.value.indexOf('https://che.openshift.io/api') !== -1) {
                this.isHostedChe = true;
            }
        });
    }
    async $getToken(): Promise<string> {
        let oAuthProvider = 'openshift';
        const unauthorisedMessage = 'Request failed with status code 401';
        // Multi-user mode doesn't support list of registered provers request,
        // so we need to check which version of openshift is registered.
        if (this.isMultiUser) {
            if (this.isHostedChe) {
                const result = await this.axiosInstance.get<{ access_token: string }>(
                    'https://auth.openshift.io/api/token?for=openshift',
                    { headers: { Authorization: ' Bearer ' + await this.oAuthUtils.getUserToken() } }
                );
                return result.data.access_token;
            }
            try {
                const openShift3token = await this.oAuthUtils.getToken('openshift-v3');
                if (openShift3token) {
                    return openShift3token;
                }
            } catch (e) {
                // 401 means that the provider is registered but Che is not authorised for it.
                oAuthProvider = e.message.indexOf(unauthorisedMessage) > 0 ? 'openshift-v3' : 'openshift-v4';
            }
        }
        let token;
        try {
            token = await this.oAuthUtils.getToken(oAuthProvider);
        } catch (e) {
            if (e.message.indexOf(unauthorisedMessage) > 0) {
                await this.oAuthUtils.authenticate(oAuthProvider);
                token = await this.oAuthUtils.getToken(oAuthProvider);
            }
        }
        if (token) {
            return token;
        } else {
            throw new Error('Failed to get OpenShift authentication token');
        }
    }
}
