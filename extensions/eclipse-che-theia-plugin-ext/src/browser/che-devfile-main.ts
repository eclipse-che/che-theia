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

    async $create(devifle: string): Promise<cheApi.workspace.Workspace> {
        this.cheApiService.getCurrentWorkspaceId();
        return Promise.reject(new Error('Method to create a WORKSPACE is still not implemened'));
    }

    // async test(factoryId: string): Promise<cheApi.factory.Factory> {
    //     return new Promise<cheApi.factory.Factory>((resolve, reject) => {
    //         this.cheApiService.getFactoryById(factoryId).then(factory => {
    //             resolve(factory);
    //         }).catch(error => {
    //             reject(error);
    //         });
    //     });
    // }

}
