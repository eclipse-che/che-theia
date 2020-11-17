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
} from '@theia/core/lib/browser';

import { interfaces } from 'inversify';

export const GitConfigSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'git.user.name': {
      type: 'string',
      description: 'Your full name to be recorded in any newly created commits.',
      default: undefined,
    },
    'git.user.email': {
      type: 'string',
      description: 'Your email address to be recorded in any newly created commits.',
      default: undefined,
    },
  },
};

export interface GitConfiguration {
  'git.user.name': string;
  'git.user.email': string;
}

export const GitPreferences = Symbol('GitPreferences');
export type GitPreferences = PreferenceProxy<GitConfiguration>;

export function createGitPreferences(preferences: PreferenceService): GitPreferences {
  return createPreferenceProxy(preferences, GitConfigSchema);
}

export function bindGitPreferences(bind: interfaces.Bind): void {
  bind(GitPreferences).toDynamicValue(ctx => {
    const preferences = ctx.container.get<PreferenceService>(PreferenceService);
    return createGitPreferences(preferences);
  });
  bind(PreferenceContribution).toConstantValue({ schema: GitConfigSchema });
}
