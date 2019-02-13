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
import { CheFactoryMain, CheApiService } from '../common/che-protocol';
import { che as cheApi } from '@eclipse-che/api';

export class CheFactoryMainImpl implements CheFactoryMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    async $getFactoryById(factoryId: string): Promise<cheApi.factory.Factory> {
        return new Promise<cheApi.factory.Factory>((resolve, reject) => {
            this.cheApiService.getFactoryById(factoryId).then(factory => {
                resolve(factory);
            }).catch(error => {
                reject(error);
            });
        });
    }

}
