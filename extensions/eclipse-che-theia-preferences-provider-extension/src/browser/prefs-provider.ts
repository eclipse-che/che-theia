/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  FrontendApplication,
  FrontendApplicationContribution,
  PreferenceScope,
  PreferenceServiceImpl,
} from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

import { DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';

@injectable()
export class PreferencesProvider implements FrontendApplicationContribution {
  @inject(DevfileService)
  private devfileService: DevfileService;

  @inject(PreferenceServiceImpl)
  private readonly preferenceService: PreferenceServiceImpl;

  @inject(WorkspaceService)
  private readonly workspaceService: WorkspaceService;

  private async getPluginsProperties(): Promise<[string, string][]> {
    const devfile = await this.devfileService.get();
    const components = devfile.components;
    if (!components) {
      throw new TypeError('Can\'t get "components" of current workspace "devfile" section.');
    }

    return components
      .map(component => {
        if (component.plugin) {
          return component.plugin.preferences || {};
        } else {
          return {};
        }
      })
      .reduce((result: [string, string][], preferences: { [key: string]: string }) => {
        Object.keys(preferences).forEach(key => {
          result.push(<[string, string]>[key, preferences[key]]);
        });
        return result;
      }, []);
  }

  async setPluginProperties(props: [string, string][]): Promise<void> {
    await this.workspaceService.roots;
    for (const [key, value] of props) {
      try {
        this.setPreferenceValue(key, JSON.parse(value));
      } catch (error) {
        console.warn('could not parse value for preference key %s, using string value: %o', key, value, error);
        this.setPreferenceValue(key, value);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async setPreferenceValue(key: string, value: any): Promise<void> {
    if (!this.preferenceService.has(key)) {
      await this.preferenceService.set(key, value, PreferenceScope.Workspace);
    }
  }

  async restorePluginProperties(): Promise<void> {
    const propsTuples = await this.getPluginsProperties();
    return this.setPluginProperties(propsTuples);
  }

  onStart(_app: FrontendApplication): Promise<void> {
    return this.restorePluginProperties();
  }
}
