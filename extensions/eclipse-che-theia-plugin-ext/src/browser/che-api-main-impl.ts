
/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { CheApiMain, CheApiService, FactoryDto } from '../common/che-protocol';
import { Workspace } from '@eclipse-che/plugin';
import { interfaces } from 'inversify';

export class CheApiMainImpl implements CheApiMain {

    private readonly service: CheApiService;

    constructor(container: interfaces.Container) {
        this.service = container.get(CheApiService);
    }

    $currentWorkspace(): Promise<Workspace> {
        return this.service.currentWorkspace().then(w => w, err => {
            console.log(err);
            return undefined!;
        });
    }

    async $getFactoryById(factoryId: string): Promise<FactoryDto> {
        return new Promise<FactoryDto>((resolve, reject) => {
            this.service.getFactory(factoryId).then(f => {
                resolve(f);
            }).catch(err => {
                reject(err);
            });
        });
    }

}
