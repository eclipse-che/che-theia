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
import { Workspace } from '@eclipse-che/plugin';

export class CheWorkspaceMainImpl implements CheWorkspaceMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    $currentWorkspace(): Promise<Workspace> {
        return this.cheApiService.currentWorkspace().then(workspace => workspace, error => {
            console.log(error);
            return undefined!;
        });
    }

}
