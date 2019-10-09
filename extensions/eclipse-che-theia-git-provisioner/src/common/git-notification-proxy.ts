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

export const CheGitNoticationServer = Symbol('CheGitNoticationServer');
export interface CheGitNoticationServer extends JsonRpcServer<CheGitNoticationClient> {
    disconectClient(client: CheGitNoticationClient): void;
}

export const CheGitNoticationClient = Symbol('CheGitNoticationClient');
export interface CheGitNoticationClient {
    notify(): void;
}
