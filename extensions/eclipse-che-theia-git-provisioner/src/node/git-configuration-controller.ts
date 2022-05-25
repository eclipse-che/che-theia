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
import * as ini from 'ini';
import * as nsfw from 'nsfw';

import { CheGitClient, CheGitService, GIT_USER_EMAIL, GIT_USER_NAME } from '../common/git-protocol';
import {
  CheTheiaUserPreferencesSynchronizer,
  THEIA_USER_PREFERENCES_PATH,
} from '@eclipse-che/theia-user-preferences-synchronizer/lib/node/che-theia-preferences-synchronizer';
import { Disposable, Emitter } from '@theia/core';
import { basename, dirname, resolve } from 'path';
import {
  createFileSync,
  ensureDirSync,
  existsSync,
  pathExistsSync,
  readFileSync,
  readdirSync,
  watch,
  writeFileSync,
} from 'fs-extra';
import { inject, injectable } from 'inversify';

import { homedir } from 'os';

export const GIT_USER_CONFIG_PATH = resolve(homedir(), '.gitconfig');
export const GIT_GLOBAL_CONFIG_PATH = '/etc/gitconfig';

export interface UserConfiguration {
  name: string | undefined;
  email: string | undefined;
}

export interface GitConfiguration {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

@injectable()
export class GitConfigurationController implements CheGitService {
  constructor(
    @inject(CheTheiaUserPreferencesSynchronizer) protected preferencesService: CheTheiaUserPreferencesSynchronizer
  ) {
    this.onGitClientSetEvent(async () => {
      await this.checkExistsWithTimeout(THEIA_USER_PREFERENCES_PATH, 60000);
      this.userGitconfigDirty = this.readConfigurationFromGitConfigFile(GIT_USER_CONFIG_PATH)!;
      const preferences = await this.preferencesService.getPreferences();
      await this.updateUserGitconfigFromPreferences(preferences);
    });
    this.onUserGitconfigChangedEvent(() => this.fetchLocalGitconfig());
  }

  private checkExistsWithTimeout(filePath: string, timeout: number): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      if (existsSync(filePath)) {
        resolvePromise();
        return;
      }
      const timer = setTimeout(() => {
        watcher.close();
        reject(new Error('File did not exists and was not created during the timeout.'));
      }, timeout);

      const dir = dirname(filePath);
      ensureDirSync(dir);
      const pathBasename = basename(filePath);
      const watcher = watch(dir, (eventType, filename) => {
        if (eventType === 'rename' && filename === pathBasename) {
          clearTimeout(timer);
          watcher.close();
          resolvePromise();
        }
      });
    });
  }

  private fetchLocalGitconfig(): void {
    const userGitconfig = this.readConfigurationFromGitConfigFile(GIT_USER_CONFIG_PATH)!;
    this.updateLocalGitconfig(userGitconfig);
    this.userGitconfigDirty = userGitconfig;
  }

  protected preferencesHandler: Disposable | undefined;

  protected gitConfigWatcher: nsfw.NSFW | undefined;

  protected client: CheGitClient;

  private readonly projectsRoot = process.env.PROJECTS_ROOT || process.env.CHE_PROJECTS_ROOT || '/projects';

  private readonly onUserGitconfigChangedEmitter = new Emitter();
  private readonly onUserGitconfigChangedEvent = this.onUserGitconfigChangedEmitter.event;

  private readonly onGitClientSetEmitter = new Emitter();
  private readonly onGitClientSetEvent = this.onGitClientSetEmitter.event;

  private userGitconfigDirty: GitConfiguration;

  private updateLocalGitconfig(gitconfig: GitConfiguration): void {
    readdirSync(this.projectsRoot, { withFileTypes: true })
      .filter(dir => dir.isDirectory())
      .forEach(dir => {
        const localGitconfigPath = resolve(this.projectsRoot, dir.name, '.git', 'config');
        let localGitconfig: GitConfiguration;
        if (existsSync(localGitconfigPath)) {
          localGitconfig = ini.parse(readFileSync(localGitconfigPath).toString());
          // Add missing values
          Object.keys(gitconfig).forEach(key => {
            if (
              localGitconfig[key] === undefined ||
              JSON.stringify(localGitconfig[key]) === JSON.stringify(this.userGitconfigDirty[key])
            ) {
              localGitconfig[key] = gitconfig[key];
            }
          });
          // Remove deleted values
          Object.keys(localGitconfig).forEach(key => {
            if (
              gitconfig[key] === undefined &&
              JSON.stringify(localGitconfig[key]) === JSON.stringify(this.userGitconfigDirty[key])
            ) {
              delete localGitconfig[key];
            }
          });
        } else {
          createFileSync(localGitconfigPath);
          localGitconfig = gitconfig;
        }
        writeFileSync(localGitconfigPath, ini.stringify(localGitconfig));
      });
  }

  public async watchGitConfigChanges(): Promise<void> {
    if (this.gitConfigWatcher) {
      return;
    }

    const gitConfigExists = pathExistsSync(GIT_USER_CONFIG_PATH);
    if (!gitConfigExists) {
      createFileSync(GIT_USER_CONFIG_PATH);
    }

    this.gitConfigWatcher = await nsfw(GIT_USER_CONFIG_PATH, async (events: nsfw.FileChangeEvent[]) => {
      for (const event of events) {
        if (event.action === nsfw.actions.MODIFIED) {
          this.onUserGitconfigChangedEmitter.fire(undefined);

          const userConfig = await this.getUserConfigurationFromGitConfig();
          const preferences = await this.preferencesService.getPreferences();

          (preferences as { [index: string]: string })[GIT_USER_NAME] = userConfig.name!;
          (preferences as { [index: string]: string })[GIT_USER_EMAIL] = userConfig.email!;

          await this.preferencesService.setPreferences(preferences);
        }
      }
    });
    await this.gitConfigWatcher.start();
  }

  async getUserConfigurationFromGitConfig(): Promise<UserConfiguration> {
    let name: string | undefined;
    let email: string | undefined;
    const config = this.readConfigurationFromGitConfigFile(GIT_USER_CONFIG_PATH);
    if (config && config.user) {
      name = config.user.name;
      email = config.user.email;
    }
    if (name && email) {
      return { name, email };
    }
    const globalConfig = this.readConfigurationFromGitConfigFile(GIT_GLOBAL_CONFIG_PATH);
    if (globalConfig && globalConfig.user) {
      name = name ? name : globalConfig.user.name;
      email = email ? email : globalConfig.user.email;
    }
    return { name, email };
  }

  protected readConfigurationFromGitConfigFile(path: string): GitConfiguration | undefined {
    if (!pathExistsSync(path)) {
      return;
    }
    const gitConfigContent = readFileSync(path, 'utf-8');
    return ini.parse(gitConfigContent);
  }

  public async watchUserPreferencesChanges(): Promise<void> {
    if (this.preferencesHandler) {
      return;
    }

    this.preferencesHandler = this.preferencesService.onUserPreferencesModify(preferences => {
      this.updateUserGitconfigFromPreferences(preferences);
    });
  }

  private async updateUserGitconfigFromPreferences(preferences: object): Promise<void> {
    const userConfig = this.getUserConfigurationFromPreferences(preferences);
    await this.updateUserGitonfigFromUserConfig(userConfig);
    this.client.firePreferencesChanged();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getUserConfigurationFromPreferences(preferences: any): UserConfiguration {
    return {
      name: preferences[GIT_USER_NAME],
      email: preferences[GIT_USER_EMAIL],
    };
  }

  public async updateUserGitonfigFromUserConfig(userConfig: UserConfiguration): Promise<void> {
    if (userConfig.name === undefined && userConfig.email === undefined) {
      return;
    }

    // read existing content
    let gitConfig = this.readConfigurationFromGitConfigFile(GIT_USER_CONFIG_PATH);
    if (!gitConfig) {
      gitConfig = {};
    } else if (!gitConfig.user) {
      gitConfig.user = {} as UserConfiguration;
    }

    if (userConfig.name) {
      gitConfig.user.name = userConfig.name;
    }

    if (userConfig.email) {
      gitConfig.user.email = userConfig.email;
    }

    if (this.gitConfigWatcher) {
      await this.gitConfigWatcher.stop();
    }
    writeFileSync(GIT_USER_CONFIG_PATH, ini.stringify(gitConfig));
    this.onUserGitconfigChangedEmitter.fire(undefined);
    if (this.gitConfigWatcher) {
      await this.gitConfigWatcher.start();
    }
  }

  setClient(client: CheGitClient): void {
    this.client = client;
    this.onGitClientSetEmitter.fire(undefined);
  }

  dispose(): void {
    // nothing todo
  }
}
