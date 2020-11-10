/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

// eslint-disable-next-line spaced-comment
/// <reference types='@theia/core/src/typings/nsfw/index'/>

import * as nsfw from 'nsfw';

import { Emitter, Event } from '@theia/core';
import { Preferences, UserService } from '@eclipse-che/theia-remote-api/lib/common/user-service';
import { dirname, resolve } from 'path';
import { ensureDir, readFile, writeFile } from 'fs-extra';
import { inject, injectable } from 'inversify';

import { homedir } from 'os';

export const THEIA_PREFERENCES_KEY = 'theia-user-preferences';
export const THEIA_USER_PREFERENCES_PATH = resolve(homedir(), '.theia', 'settings.json');

@injectable()
export class CheTheiaUserPreferencesSynchronizer {
  @inject(UserService)
  protected userService: UserService;

  protected settingsJsonWatcher: nsfw.NSFW | undefined;

  protected readonly onUserPreferencesModifyEmitter = new Emitter<object>();
  readonly onUserPreferencesModify: Event<object> = this.onUserPreferencesModifyEmitter.event;

  protected fireUserPreferencesModify(userPreferences: object): void {
    this.onUserPreferencesModifyEmitter.fire(userPreferences);
  }

  /**
   * Provides stored Theia user preferences into workspace.
   */
  public async readTheiaUserPreferencesFromCheSettings(): Promise<void> {
    const chePreferences = await this.userService.getUserPreferences(THEIA_PREFERENCES_KEY);
    const theiaPreferences = chePreferences[THEIA_PREFERENCES_KEY] ? chePreferences[THEIA_PREFERENCES_KEY] : '{}';
    const theiaPreferencesBeautified = JSON.stringify(JSON.parse(theiaPreferences), undefined, 3);
    await ensureDir(dirname(THEIA_USER_PREFERENCES_PATH));
    await writeFile(THEIA_USER_PREFERENCES_PATH, theiaPreferencesBeautified, 'utf8');
  }

  public async getPreferences(): Promise<object> {
    const userPreferencesContent = await readFile(THEIA_USER_PREFERENCES_PATH, 'utf8');
    const userPreferences = JSON.parse(userPreferencesContent);

    return userPreferences;
  }

  public async setPreferences(preferences: object): Promise<void> {
    const theiaPreferencesBeautified = JSON.stringify(preferences, undefined, 3);
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
    let userPreferencesContent = await readFile(THEIA_USER_PREFERENCES_PATH, 'utf8');
    try {
      // check json validity and remove indents
      const userPreferences = JSON.parse(userPreferencesContent);
      this.fireUserPreferencesModify(userPreferences);
      userPreferencesContent = JSON.stringify(userPreferences);
    } catch (error) {
      // settings.json has syntax error, do not update anything
      return;
    }

    const update: Preferences = {};
    update[THEIA_PREFERENCES_KEY] = userPreferencesContent;
    await this.userService.updateUserPreferences(update);
  }
}
