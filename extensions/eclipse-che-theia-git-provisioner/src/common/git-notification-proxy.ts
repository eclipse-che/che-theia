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

export const GIT_USER_NAME = 'git.user.name';
export const GIT_USER_EMAIL = 'git.user.email';

export const CheGitNoticationPath = '/services/che-git-notification';

export const CheGitNoticationClient = Symbol('CheGitNoticationClient');

export interface CheGitNoticationClient {
    notify(): void;
}

export const CheGitNoticationServer = Symbol('CheGitNoticationServer');

export interface CheGitNoticationServer extends JsonRpcServer<CheGitNoticationClient> { }

export interface GitConfigChanged { }
