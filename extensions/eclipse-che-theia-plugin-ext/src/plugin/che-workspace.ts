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
import { PLUGIN_RPC_CONTEXT, CheWorkspace, CheWorkspaceMain } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';
import { KeyValue } from '@eclipse-che/plugin';

export class CheWorkspaceImpl implements CheWorkspace {

    private readonly workspaceMain: CheWorkspaceMain;

    constructor(rpc: RPCProtocol) {
        this.workspaceMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_WORKSPACE_MAIN);
    }

    getSettings(): Promise<KeyValue> {
        throw new Error('Method not implemented.');
    }

    stop(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    startTemporary(config: cheApi.workspace.WorkspaceConfig): Promise<any> {
        throw new Error('Method not implemented.');
    }

    start(workspaceId: string, environmentName: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    deleteWorkspace(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any> {
        return this.workspaceMain.$update(workspaceId, workspace);
    }

    create(config: cheApi.workspace.WorkspaceConfig, params: KeyValue): Promise<any> {
        throw new Error('Method not implemented.');
    }

    getById(workspaceId: string): Promise<cheApi.workspace.Workspace> {
        return this.workspaceMain.$getById(workspaceId);
    }

    getAllByNamespace(namespace: string): Promise<cheApi.workspace.Workspace[]> {
        throw new Error('Method not implemented.');
    }

    getAll(): Promise<cheApi.workspace.Workspace[]> {
        throw new Error('Method not implemented.');
    }

    getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
        return this.workspaceMain.$getCurrentWorkspace();
    }

}
