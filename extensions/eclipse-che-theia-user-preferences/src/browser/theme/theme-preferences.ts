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
import { ThemeService } from '@theia/core/lib/browser/theming';

export const TheiaThemeConfigurationSchema: PreferenceSchema = {
    'type': 'object',
    properties: {
        'workbench.appearance.colorTheme': {
            type: 'string',
            description: 'Specifies the color theme used in the Theia.',
            default: 'dark',
            enum: ThemeService.get().getThemes().map(theme => theme.id)
        }
    }
};

export interface TheiaThemeConfiguration {
    'workbench.appearance.colorTheme': string;
}

export const TheiaThemePreferences = Symbol('TheiaThemePreferences');
export type TheiaThemePreferences = PreferenceProxy<TheiaThemeConfiguration>;

export function createTheiaThemePreferences(preferences: PreferenceService): TheiaThemePreferences {
    return createPreferenceProxy(preferences, TheiaThemeConfigurationSchema);
}

export function bindTheiaThemePreferences(bind: interfaces.Bind): void {
    bind(TheiaThemePreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createTheiaThemePreferences(preferences);
    });
    bind(PreferenceContribution).toConstantValue({ schema: TheiaThemeConfigurationSchema });
}
