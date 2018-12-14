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
import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { Plugin } from '@theia/plugin-ext/lib/api/plugin-api';
import { Workspace, WorkspaceConfig, ResourceCreateQueryParams, WorkspaceSettings } from '@eclipse-che/plugin';
import { CheApiPluginImpl } from './che-workspace';
export interface ApiFactory {
    (plugin: Plugin): typeof che;
}

export function createAPIFactory(rpc: RPCProtocol): ApiFactory {
    const chePluginImpl = new CheApiPluginImpl(rpc);
    return function (plugin: Plugin): typeof che {
        const ws: typeof che.workspace = {
            getCurrentWorkspace(): Promise<Workspace> {
                return chePluginImpl.getCurrentWorkspace();
            },
            getAll(): Promise<Workspace[]> {
                return chePluginImpl.getAll();
            },
            getAllByNamespace(namespace: string): Promise<Workspace[]> {
                return chePluginImpl.getAllByNamespace(namespace);
            },
            getById(workspaceKey: string): Promise<Workspace> {
                return chePluginImpl.getById(workspaceKey);
            },
            create(config: WorkspaceConfig, params: ResourceCreateQueryParams): Promise<any> {
                return chePluginImpl.create(config, params);
            },
            update(workspaceId: string, workspace: Workspace): Promise<any> {
                return chePluginImpl.update(workspaceId, workspace);
            },
            deleteWorkspace(workspaceId: string): Promise<any> {
                return chePluginImpl.deleteWorkspace(workspaceId);
            },
            start(workspaceId: string, environmentName: string): Promise<any> {
                return chePluginImpl.start(workspaceId, environmentName);
            },
            startTemporary(config: WorkspaceConfig): Promise<any> {
                return chePluginImpl.startTemporary(config);
            },
            stop(workspaceId: string): Promise<any> {
                return chePluginImpl.stop(workspaceId);
            },
            getSettings(): Promise<WorkspaceSettings> {
                return chePluginImpl.getSettings();
            }
        };

        const factory: typeof che.factory = {
            getFactory(factoryId: string): Promise<che.MYFactory> {
                return chePluginImpl.getFactory(factoryId);
            }
        };

        return <typeof che>{
            workspace: ws,
            factory
        };
    };
}
