/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
// eslint-disable-next-line spaced-comment
import * as ini from 'ini';
import * as k8s from '@kubernetes/client-node';
import * as nsfw from 'nsfw';

import { CheGitClient, CheGitService, GIT_USER_EMAIL, GIT_USER_NAME } from '../common/git-protocol';
import { Disposable, Emitter } from '@theia/core';
import { createFile, pathExists, readFile, writeFile } from 'fs-extra';
import { inject, injectable } from 'inversify';

import { CheTheiaUserPreferencesSynchronizer } from '@eclipse-che/theia-user-preferences-synchronizer/lib/node/che-theia-preferences-synchronizer';
import { K8SServiceImpl } from '@eclipse-che/theia-remote-impl-k8s/lib/node/k8s-service-impl';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { homedir } from 'os';
import { resolve } from 'path';

export const GIT_USER_CONFIG_PATH = resolve(homedir(), '.gitconfig');
export const GIT_GLOBAL_CONFIG_PATH = '/etc/gitconfig';
export const GITCONFIG_CONFIGMAP_NAME = 'workspace-gitconfig-storage';

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
  @inject(WorkspaceService)
  private readonly workspaceService: WorkspaceService;

  constructor(@inject(K8SServiceImpl) private readonly cheK8SService: K8SServiceImpl) {
    this.createGitconfigConfigmapIfNeeded().then(configmapExists => {
      if (configmapExists) {
        this.updateUserGitconfigFromConfigmap();
      }
    });
    this.onUserGitconfigChangedEvent(() => this.createGitconfigConfigmapIfNeededAndUpdate());
  }

  @inject(CheTheiaUserPreferencesSynchronizer)
  protected preferencesService: CheTheiaUserPreferencesSynchronizer;

  protected preferencesHandler: Disposable | undefined;

  protected gitConfigWatcher: nsfw.NSFW | undefined;

  protected client: CheGitClient;

  private onUserGitconfigChangedEmitter = new Emitter();
  private onUserGitconfigChangedEvent = this.onUserGitconfigChangedEmitter.event;

  /**
   * Returns true if the configmap already exists, otherwise returns false.
   */
  private async createGitconfigConfigmapIfNeeded(): Promise<boolean> {
    if (await this.isGitconfigConfigmapExists()) {
      return true;
    }
    const configmap: k8s.V1ConfigMap = {
      metadata: {
        name: GITCONFIG_CONFIGMAP_NAME,
        annotations: {
          'controller.devfile.io/mount-as': 'subpath',
          'controller.devfile.io/mount-path': '/etc',
        },
        labels: {
          'controller.devfile.io/mount-to-devworkspace': 'true',
          'controller.devfile.io/watch-configmap': 'true',
        },
      },
      data: { gitconfig: fs.existsSync(GIT_USER_CONFIG_PATH) ? fs.readFileSync(GIT_USER_CONFIG_PATH).toString() : '' },
    };
    try {
      const client = await this.cheK8SService.makeApiClient(k8s.CoreV1Api);
      await client.createNamespacedConfigMap(await this.workspaceService.getCurrentNamespace(), configmap);
    } catch (e) {
      console.error('Failed to create gitconfig configmap. ' + e);
    }
    return false;
  }

  private async isGitconfigConfigmapExists(): Promise<boolean> {
    try {
      const client = await this.cheK8SService.makeApiClient(k8s.CoreV1Api);
      const request = await client.listNamespacedConfigMap(await this.workspaceService.getCurrentNamespace());
      return (
        request.body.items.find(
          configmap => configmap.metadata && configmap.metadata.name === GITCONFIG_CONFIGMAP_NAME
        ) !== undefined
      );
    } catch (e) {
      console.error('Failed to list configmaps. ' + e);
    }
    return false;
  }

  private async createGitconfigConfigmapIfNeededAndUpdate(): Promise<void> {
    await this.createGitconfigConfigmapIfNeeded();
    const client = await this.cheK8SService.makeApiClient(k8s.CoreV1Api);
    client.defaultHeaders = {
      'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH,
    };
    try {
      await client.patchNamespacedConfigMap(
        GITCONFIG_CONFIGMAP_NAME,
        await this.workspaceService.getCurrentNamespace(),
        {
          data: { gitconfig: fs.readFileSync(GIT_USER_CONFIG_PATH).toString() },
        }
      );
    } catch (e) {
      console.error('Failed to update gitconfig configmap. ' + e);
    }
  }

  private async updateUserGitconfigFromConfigmap(): Promise<void> {
    try {
      const client = await this.cheK8SService.makeApiClient(k8s.CoreV1Api);
      const request = await client.readNamespacedConfigMap(
        GITCONFIG_CONFIGMAP_NAME,
        await this.workspaceService.getCurrentNamespace()
      );
      const content = request.body.data!.gitconfig;
      fs.ensureFileSync(GIT_USER_CONFIG_PATH);
      fs.writeFileSync(GIT_USER_CONFIG_PATH, content);
    } catch (e) {
      console.error('Failed to read gitconfig configmap. ' + e);
    }
  }

  public async watchGitConfigChanges(): Promise<void> {
    if (this.gitConfigWatcher) {
      return;
    }

    const gitConfigExists = await pathExists(GIT_USER_CONFIG_PATH);
    if (!gitConfigExists) {
      await createFile(GIT_USER_CONFIG_PATH);
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
        } else if (event.action === nsfw.actions.CREATED) {
          this.onUserGitconfigChangedEmitter.fire(undefined);
        }
      }
    });
    await this.gitConfigWatcher.start();
  }

  async getUserConfigurationFromGitConfig(): Promise<UserConfiguration> {
    let name: string | undefined;
    let email: string | undefined;
    const config = await this.readConfigurationFromGitConfigFile(GIT_USER_CONFIG_PATH);
    if (config && config.user) {
      name = config.user.name;
      email = config.user.email;
    }
    if (name && email) {
      return { name, email };
    }
    const globalConfig = await this.readConfigurationFromGitConfigFile(GIT_GLOBAL_CONFIG_PATH);
    if (globalConfig && globalConfig.user) {
      name = name ? name : globalConfig.user.name;
      email = email ? email : globalConfig.user.email;
    }
    return { name, email };
  }

  protected async readConfigurationFromGitConfigFile(path: string): Promise<GitConfiguration | undefined> {
    if (!(await pathExists(path))) {
      return;
    }
    const gitConfigContent = await readFile(path, 'utf-8');
    return ini.parse(gitConfigContent);
  }

  public async watchUserPreferencesChanges(): Promise<void> {
    if (this.preferencesHandler) {
      return;
    }

    this.preferencesHandler = this.preferencesService.onUserPreferencesModify(preferences => {
      const userConfig = this.getUserConfigurationFromPreferences(preferences);
      this.updateGlobalGitConfig(userConfig);
      this.client.firePreferencesChanged();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getUserConfigurationFromPreferences(preferences: any): UserConfiguration {
    return {
      name: preferences[GIT_USER_NAME],
      email: preferences[GIT_USER_EMAIL],
    };
  }

  public async updateGlobalGitConfig(userConfig: UserConfiguration): Promise<void> {
    if (userConfig.name === undefined && userConfig.email === undefined) {
      return;
    }

    // read existing content
    let gitConfig = await this.readConfigurationFromGitConfigFile(GIT_USER_CONFIG_PATH);
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
    await writeFile(GIT_USER_CONFIG_PATH, ini.stringify(gitConfig));
    this.onUserGitconfigChangedEmitter.fire(undefined);
    if (this.gitConfigWatcher) {
      await this.gitConfigWatcher.start();
    }
  }

  setClient(client: CheGitClient): void {
    this.client = client;
  }

  dispose(): void {
    // nothing todo
  }
}
