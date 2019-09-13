/********************************************************************************
 * Copyright (C) 2018-2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { interfaces } from 'inversify';
import { createPreferenceProxy, PreferenceProxy, PreferenceService, PreferenceContribution, PreferenceSchema } from '@theia/core/lib/browser';

export const GitConfigSchema: PreferenceSchema = {
    'type': 'object',
    'properties': {
        'git.user.name': {
            'type': 'string',
            'description': 'Your full name to be recorded in any newly created commits.',
            'default': undefined
        },
        'git.user.email': {
            'type': 'string',
            'description': 'Your email address to be recorded in any newly created commits.',
            'default': undefined
        }
    }
};

export interface GitConfiguration {
    'git.user.name': string,
    'git.user.email': string
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
