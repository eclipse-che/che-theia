/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { CheApiService, CheUserMain } from '../common/che-protocol';
import { Preferences } from '@eclipse-che/plugin';

export class CheUserMainImpl implements CheUserMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container) {
        this.cheApiService = container.get(CheApiService);
    }

    $getUserPreferences(filter?: string): Promise<Preferences> {
        return this.cheApiService.getUserPreferences(filter);
    }

    $updateUserPreferences(preferences: Preferences): Promise<Preferences> {
        return this.cheApiService.updateUserPreferences(preferences);
    }

    $replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
        return this.cheApiService.replaceUserPreferences(preferences);
    }

    $deleteUserPreferences(list?: string[]): Promise<void> {
        return this.cheApiService.deleteUserPreferences(list);
    }
}
