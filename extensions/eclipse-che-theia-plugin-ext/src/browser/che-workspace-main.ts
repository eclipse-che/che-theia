/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { CheWorkspaceMain, CheApiService } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';

export class CheWorkspaceMainImpl implements CheWorkspaceMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    $getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
        return this.cheApiService.currentWorkspace().then(workspace => workspace, error => {
            console.log(error);
            return undefined!;
        });
    }

    async $getById(workspaceId: string): Promise<cheApi.workspace.Workspace> {
        return this.cheApiService.getWorkspaceById(workspaceId).then(workspace => workspace, error => {
            console.log(error);
            return undefined!;
        });
    }

    async $update(workspaceId: string, workspace: cheApi.workspace.Workspace): Promise<cheApi.workspace.Workspace> {
        return await this.cheApiService.updateWorkspace(workspaceId, workspace);
    }

}
