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
import { CheFactoryMain } from '../common/che-protocol';
import { CheApiService, FactoryDto } from '../common/che-protocol';

export class CheFactoryMainImpl implements CheFactoryMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    async $getFactoryById(factoryId: string): Promise<FactoryDto> {
        return new Promise<FactoryDto>((resolve, reject) => {
            this.cheApiService.getFactoryById(factoryId).then(factory => {
                resolve(factory);
            }).catch(error => {
                reject(error);
            });
        });
    }

}
