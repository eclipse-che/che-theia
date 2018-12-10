/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { MainPluginApiProvider } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { injectable, interfaces } from 'inversify';
import { PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { CheApiPluginMainImpl } from './che-workspace-main';

@injectable()
export class CheMainApiProvider implements MainPluginApiProvider {

    initialize(rpc: RPCProtocol, container: interfaces.Container): void {
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_API_MAIN, new CheApiPluginMainImpl(container));
    }
}
