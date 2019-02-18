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
import { CheWorkspaceMainImpl } from './che-workspace-main';
import { CheFactoryMainImpl } from './che-factory-main';
import { CheVariablesMainImpl } from './che-variables-main';
import { CheTaskMainImpl } from './che-task-main';

@injectable()
export class CheApiProvider implements MainPluginApiProvider {

    initialize(rpc: RPCProtocol, container: interfaces.Container): void {
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_WORKSPACE_MAIN, new CheWorkspaceMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_FACTORY_MAIN, new CheFactoryMainImpl(container));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_VARIABLES_MAIN, new CheVariablesMainImpl(container, rpc));
        rpc.set(PLUGIN_RPC_CONTEXT.CHE_TASK_MAIN, new CheTaskMainImpl(container, rpc));
    }

}
