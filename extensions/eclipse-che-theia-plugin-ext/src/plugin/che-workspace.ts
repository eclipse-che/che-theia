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
import { PLUGIN_RPC_CONTEXT, CheWorkspace, CheWorkspaceMain } from '../common/che-protocol';
import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';

export class CheWorkspaceImpl implements CheWorkspace {

    private readonly workspaceMain: CheWorkspaceMain;

    constructor(rpc: RPCProtocol) {
        this.workspaceMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_WORKSPACE_MAIN);
    }

    getSettings(): Promise<che.KeyValue> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stop(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startTemporary(config: cheApi.workspace.WorkspaceConfig): Promise<any> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    start(workspaceId: string, environmentName: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteWorkspace(workspaceId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<any> {
        return this.workspaceMain.$update(workspaceId, workspace);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(config: cheApi.workspace.WorkspaceConfig, params: che.KeyValue): Promise<any> {
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
