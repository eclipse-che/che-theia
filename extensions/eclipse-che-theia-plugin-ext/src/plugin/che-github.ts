/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheGithub, CheGithubMain } from '../common/che-protocol';

export class CheGithubImpl implements CheGithub {

    private readonly githubMain: CheGithubMain;

    constructor(rpc: RPCProtocol) {
        this.githubMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_GITHUB_MAIN);
    }

    uploadPublicSshKey(publicKey: string): Promise<void> {
        return this.githubMain.$uploadPublicSshKey(publicKey);
    }

    getToken(): Promise<string> {
        return this.githubMain.$getToken();
    }
}
