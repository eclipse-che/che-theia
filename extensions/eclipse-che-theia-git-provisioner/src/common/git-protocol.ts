/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { JsonRpcServer } from '@theia/core';
import { UserConfiguration } from '../node/git-configuration-controller';

export const GIT_USER_NAME = 'git.user.name';
export const GIT_USER_EMAIL = 'git.user.email';

export const CheGitServicePath = '/services/che-git-service';

export const CheGitClient = Symbol('CheGitClient');

export interface CheGitClient {
    firePreferencesChanged(): void;
}

export const CheGitService = Symbol('CheGitService');

export interface CheGitService extends JsonRpcServer<CheGitClient> {
    getUserConfigurationFromGitConfig(): Promise<UserConfiguration>
}

export interface GitConfigChanged { }
