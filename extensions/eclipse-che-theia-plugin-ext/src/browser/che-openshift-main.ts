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

export class CheOpenshiftMainImpl implements CheOpenshiftMain {
    private readonly oAuthUtils: OauthUtils;

    constructor(container: interfaces.Container) {
        this.oAuthUtils = container.get(OauthUtils);
    }
    async $getToken(): Promise<string> {
        const oAuthProvider = 'openshift';
        let token = await this.oAuthUtils.getToken(oAuthProvider);
        if (!token) {
            await this.oAuthUtils.authenticate(oAuthProvider);
            token = await this.oAuthUtils.getToken(oAuthProvider);
        }
        if (token) {
            return token;
        } else {
            throw new Error('Failed to get OpenShift authentication token');
        }
    }
}
