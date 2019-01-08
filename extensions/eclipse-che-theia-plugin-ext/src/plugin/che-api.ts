/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';
import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { Plugin } from '@theia/plugin-ext/lib/api/plugin-api';
import { Variable, Disposable, KeyValue } from '@eclipse-che/plugin';
import { CheWorkspaceImpl } from './che-workspace';
import { CheVariablesImpl } from './che-variables';
import { PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { CheFactoryImpl } from './che-factory';

export interface CheApiFactory {
    (plugin: Plugin): typeof che;
}

export function createAPIFactory(rpc: RPCProtocol): CheApiFactory {
    const cheWorkspaceImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_WORKSPACE, new CheWorkspaceImpl(rpc));
    const cheFactoryImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_FACTORY, new CheFactoryImpl(rpc));
    const cheVariablesImpl = rpc.set(PLUGIN_RPC_CONTEXT.CHE_VARIABLES, new CheVariablesImpl(rpc));

    return function (plugin: Plugin): typeof che {
        const workspace: typeof che.workspace = {
            getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
                return cheWorkspaceImpl.getCurrentWorkspace();
            },
            getAll(): Promise<cheApi.workspace.Workspace[]> {
                return cheWorkspaceImpl.getAll();
            },
            getAllByNamespace(namespace: string): Promise<cheApi.workspace.Workspace[]> {
                return cheWorkspaceImpl.getAllByNamespace(namespace);
            },
            getById(workspaceKey: string): Promise<cheApi.workspace.Workspace> {
                return cheWorkspaceImpl.getById(workspaceKey);
            },
            create(config: cheApi.workspace.WorkspaceConfig, params: KeyValue): Promise<any> {
                return cheWorkspaceImpl.create(config, params);
            },
            update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any> {
                return cheWorkspaceImpl.update(workspaceId, workspace);
            },
            deleteWorkspace(workspaceId: string): Promise<any> {
                return cheWorkspaceImpl.deleteWorkspace(workspaceId);
            },
            start(workspaceId: string, environmentName: string): Promise<any> {
                return cheWorkspaceImpl.start(workspaceId, environmentName);
            },
            startTemporary(config: cheApi.workspace.WorkspaceConfig): Promise<any> {
                return cheWorkspaceImpl.startTemporary(config);
            },
            stop(workspaceId: string): Promise<any> {
                return cheWorkspaceImpl.stop(workspaceId);
            },
            getSettings(): Promise<KeyValue> {
                return cheWorkspaceImpl.getSettings();
            }
        };

        const factory: typeof che.factory = {
            getById(id: string): PromiseLike<cheApi.factory.Factory> {
                return cheFactoryImpl.getFactoryById(id);
            }
        };

        const variables: typeof che.variables = {
            registerVariable(variable: Variable): Promise<Disposable> {
                return cheVariablesImpl.registerVariable(variable);
            },
            resolve(value: string): Promise<string | undefined> {
                return cheVariablesImpl.resolve(value);
            }
        };

        return <typeof che>{
            workspace,
            factory,
            variables
        };
    };

}
