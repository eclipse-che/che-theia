
/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { CheApiMain, CheApiService, MYFactoryDto } from '../common/che-protocol';
import { Workspace } from '@eclipse-che/plugin';
import { interfaces } from 'inversify';

export class CheApiPluginMainImpl implements CheApiMain {

    private readonly delegate: CheApiService;

    constructor(container: interfaces.Container) {
        this.delegate = container.get(CheApiService);
    }

    $currentWorkspace(): Promise<Workspace> {
        return this.delegate.currentWorkspace().then(w => w, err => {
            console.log(err);
            return undefined!;
        });
    }

    $getFactory(factoryId: string): Promise<MYFactoryDto> {
        throw new Error('getFactoryById is not implemented');
    }

}
