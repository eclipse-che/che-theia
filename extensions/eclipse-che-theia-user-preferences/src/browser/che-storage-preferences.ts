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
import { createPreferenceProxy, PreferenceProxy, PreferenceService, PreferenceContribution, PreferenceSchema } from '@theia/core/lib/browser';

export const StorageServiceConfigurationSchema: PreferenceSchema = {
    'type': 'object',
    properties: {
        'workbench.layout.saveTimeout': {
            type: 'number',
            description: 'Timeout in milliseconds before the Theia store it layout. Must be a positive integer.',
            default: 10000
        }
    }
};

export interface StorageServiceConfiguration {
    'workbench.layout.saveTimeout': number;
}

export const StorageServicePreferences = Symbol('StorageServicePreferences');
export type StorageServicePreferences = PreferenceProxy<StorageServiceConfiguration>;

export function createStorageServicePreferences(preferences: PreferenceService): StorageServicePreferences {
    return createPreferenceProxy(preferences, StorageServiceConfigurationSchema);
}

export function bindStorageServicePreferences(bind: interfaces.Bind): void {
    bind(StorageServicePreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createStorageServicePreferences(preferences);
    });
    bind(PreferenceContribution).toConstantValue({ schema: StorageServiceConfigurationSchema });
}
