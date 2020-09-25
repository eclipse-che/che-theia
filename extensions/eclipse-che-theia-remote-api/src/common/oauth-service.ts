/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

export const cheOAuthServicePath = '/services/che-oauth-service';

export const OAuthService = Symbol('OAuthService');

export interface OAuthService {

    getOAuthToken(oAuthProvider: string, userToken?: string): Promise<string | undefined>;
    getOAuthProviders(userToken?: string): Promise<string[]>;

}
