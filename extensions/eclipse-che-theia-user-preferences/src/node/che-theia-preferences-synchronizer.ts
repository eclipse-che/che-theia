/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as k8s from '@kubernetes/client-node';
import * as nsfw from 'nsfw';

import { Emitter, Event } from '@theia/core';
import { dirname, resolve } from 'path';
import { ensureDir, readFile, writeFile } from 'fs-extra';
import { inject, injectable } from 'inversify';

import { K8SServiceImpl } from '@eclipse-che/theia-remote-impl-k8s/lib/node/k8s-service-impl';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common';
import { homedir } from 'os';

export const THEIA_PREFERENCES_KEY = 'theia-user-preferences';
export const WORKSPACE_PREFERENCES_CONFIGMAP_NAME = 'workspace-preferences-configmap';
export const THEIA_USER_PREFERENCES_PATH = resolve(homedir(), '.theia', 'settings.json');

@injectable()
export class CheTheiaUserPreferencesSynchronizer {
  @inject(K8SServiceImpl)
  private readonly cheK8SService: K8SServiceImpl;

  @inject(WorkspaceService)
  private readonly workspaceService: WorkspaceService;

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
    await ensureDir(dirname(THEIA_USER_PREFERENCES_PATH));
    let content = '';
    let preferences;
    try {
      const client = await this.cheK8SService.makeApiClient(k8s.CoreV1Api);
      const request = await client.readNamespacedConfigMap(
        WORKSPACE_PREFERENCES_CONFIGMAP_NAME,
        await this.workspaceService.getCurrentNamespace()
      );
      if (request.body && request.body.data && request.body.data[THEIA_PREFERENCES_KEY]) {
        preferences = JSON.parse(request.body.data[THEIA_PREFERENCES_KEY]);
        content = JSON.stringify(preferences, undefined, 3);
      }
    } catch (e) {
      console.error('Failed to retrieve preferences storage.', e);
    }
    await writeFile(THEIA_USER_PREFERENCES_PATH, content, 'utf8');
    if (preferences) {
      this.onUserPreferencesModifyEmitter.fire(preferences);
    }
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

    this.settingsJsonWatcher = await nsfw(THEIA_USER_PREFERENCES_PATH, (events: nsfw.FileChangeEvent[]) => {
      for (const event of events) {
        if (event.action === nsfw.actions.MODIFIED) {
          this.updateTheiaUserPreferences();
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
   * Updates Theia user preferences which stored in the workspace-preferences config-map
   */
  protected async updateTheiaUserPreferences(): Promise<void> {
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

    const client = await this.cheK8SService.makeApiClient(k8s.CoreV1Api);
    client.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH,
    };
    try {
      await client.patchNamespacedConfigMap(
        WORKSPACE_PREFERENCES_CONFIGMAP_NAME,
        await this.workspaceService.getCurrentNamespace(),
        {
          data: { [THEIA_PREFERENCES_KEY]: userPreferencesContent },
        }
      );
    } catch (e) {
      console.error('Failed to update preferences storage.', e);
    }
  }
}
