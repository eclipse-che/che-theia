/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheDevfile, CheDevfileMain } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';

export class CheDevfileImpl implements CheDevfile {

    private readonly devfileMain: CheDevfileMain;

    constructor(rpc: RPCProtocol) {
        this.devfileMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_DEVFILE_MAIN);
    }

    async create(devfileContent: string): Promise<cheApi.workspace.Workspace> {
        try {
            return await this.devfileMain.$create(devfileContent);
        } catch (e) {
            return Promise.reject(e);
        }
    }

}
