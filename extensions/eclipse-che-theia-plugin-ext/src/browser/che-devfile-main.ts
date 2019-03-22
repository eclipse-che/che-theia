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
import { CheDevfileMain, CheApiService } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';

export class CheDevfileMainImpl implements CheDevfileMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    async $create(devfileContent: string): Promise<cheApi.workspace.Workspace> {
        return new Promise<cheApi.workspace.Workspace>((resolve, reject) => {
            this.cheApiService.createWorkspace(devfileContent).then(workspace => {
                resolve(workspace);
            }).catch(error => {
                reject(error);
            });
        });
    }

}
