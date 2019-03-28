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

/// <reference types='@theia/core/src/typings/nsfw/index'/>

import { injectable, inject } from 'inversify';
import { readFile, writeFile, ensureDir } from 'fs-extra';
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import * as nsfw from 'nsfw';
import { CheApiService, Preferences } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';

export const THEIA_PREFERENCES_KEY = 'theia-user-preferences';
export const THEIA_USER_PREFERENCES_PATH = resolve(homedir(), '.theia', 'settings.json');

@injectable()
export class CheTheiaUserPreferencesSynchronizer {

    @inject(CheApiService)
    protected cheApiService: CheApiService;

    protected settingsJsonWatcher: nsfw.NSFW | undefined;

    /**
     * Provides stored Theia user preferences into workspace.
     */
    public async readTheiaUserPreferencesFromCheSettings(): Promise<void> {
        const chePreferences = await this.cheApiService.getUserPreferences(THEIA_PREFERENCES_KEY);
        const theiaPreferences = chePreferences[THEIA_PREFERENCES_KEY] ? chePreferences[THEIA_PREFERENCES_KEY] : '{}';
        const theiaPreferencesBeautified = JSON.stringify(JSON.parse(theiaPreferences), undefined, 3);
        await ensureDir(dirname(THEIA_USER_PREFERENCES_PATH));
        await writeFile(THEIA_USER_PREFERENCES_PATH, theiaPreferencesBeautified, 'utf8');
    }

    public async watchUserPreferencesChanges(): Promise<void> {
        if (this.settingsJsonWatcher) {
            // Already watching
            return;
        }

        this.settingsJsonWatcher = await nsfw(THEIA_USER_PREFERENCES_PATH, (events: nsfw.ChangeEvent[]) => {
            for (const event of events) {
                if (event.action === nsfw.actions.MODIFIED) {
                    this.updateTheiaUserPreferencesInCheSettings();
                    return;
                }
            }
        });
        await this.settingsJsonWatcher.start();
    }

    public async unwatchUserPreferencesChanges(): Promise<void> {
        if (this.settingsJsonWatcher) {
            await this.settingsJsonWatcher.stop();
            this.settingsJsonWatcher = undefined;
        }
    }

    /**
     * Updates Theia user preferences which stored in Che
     */
    protected async updateTheiaUserPreferencesInCheSettings(): Promise<void> {
        let userPreferences = await readFile(THEIA_USER_PREFERENCES_PATH, 'utf8');
        try {
            // check json validity and remove indents
            userPreferences = JSON.stringify(JSON.parse(userPreferences));
        } catch (error) {
            // settings.json has syntax error, do not update anything
            return;
        }

        const update: Preferences = {};
        update[THEIA_PREFERENCES_KEY] = userPreferences;
        await this.cheApiService.updateUserPreferences(update);
    }

}
