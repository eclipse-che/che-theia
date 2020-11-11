/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  PreferenceContribution,
  PreferenceProxy,
  PreferenceSchema,
  PreferenceService,
  createPreferenceProxy,
} from '@theia/core/lib/browser/preferences';

import { interfaces } from 'inversify';

export const chePluginPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'chePlugins.repositories': {
      description: 'Custom plugin repositories',
      type: 'object',
      default: {},
    },
  },
};

export interface ChePluginPreferenceConfiguration {
  'chePlugins.repositories': { [name: string]: string };
}

export const ChePluginPreferences = Symbol('ChePluginPreferences');
export type ChePluginPreferences = PreferenceProxy<ChePluginPreferenceConfiguration>;

export function createChePluginPreferences(preferences: PreferenceService): ChePluginPreferences {
  return createPreferenceProxy(preferences, chePluginPreferenceSchema);
}

export function bindChePluginPreferences(bind: interfaces.Bind): void {
  bind(ChePluginPreferences)
    .toDynamicValue(ctx => {
      const preferences = ctx.container.get<PreferenceService>(PreferenceService);
      return createChePluginPreferences(preferences);
    })
    .inSingletonScope();

  bind(PreferenceContribution).toConstantValue({ schema: chePluginPreferenceSchema });
}
