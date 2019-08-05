/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheFactory, CheFactoryMain } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';

export class CheFactoryImpl implements CheFactory {

    private readonly factoryMain: CheFactoryMain;

    constructor(rpc: RPCProtocol) {
        this.factoryMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_FACTORY_MAIN);
    }

    async getFactoryById(factoryId: string): Promise<cheApi.factory.Factory> {
        try {
            return await this.factoryMain.$getFactoryById(factoryId);
        } catch (e) {
            return Promise.reject(e);
        }
    }

}
