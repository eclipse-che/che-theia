/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

/**
 * Manage access to the devfile
 */
@injectable()
export class DevfileHandler {
  public static readonly DISABLED_RECOMMENDATIONS_PROPERTY = 'extensions.ignoreRecommendations';
  public static readonly OPENFILES_RECOMMENDATIONS_PROPERTY = 'extensions.openFileRecommendations';

  async isRecommendedExtensionsDisabled(): Promise<boolean> {
    const cheWorkspace = await this.getWorkspace();
    // always has a devfile now
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const devfile = cheWorkspace.devfile!;
    const attributes = devfile.attributes || {};
    const ignoreRecommendations = attributes[DevfileHandler.DISABLED_RECOMMENDATIONS_PROPERTY] || 'false';
    return ignoreRecommendations === 'true';
  }

  async isRecommendedExtensionsOpenFileEnabled(): Promise<boolean> {
    const cheWorkspace = await this.getWorkspace();
    // always has a devfile now
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const devfile = cheWorkspace.devfile!;
    const attributes = devfile.attributes || {};
    const openFilesRecommendations = attributes[DevfileHandler.OPENFILES_RECOMMENDATIONS_PROPERTY] || 'false';
    return openFilesRecommendations === 'true';
  }

  async disableRecommendations(): Promise<void> {
    const workspace = await this.getWorkspace();
    // always an id
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workspaceId = workspace.id!;
    // always has a devfile now
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const devfile = workspace.devfile!;
    const attributes = devfile.attributes || {};
    attributes[DevfileHandler.DISABLED_RECOMMENDATIONS_PROPERTY] = 'true';
    devfile.attributes = attributes;
    await che.workspace.update(workspaceId, workspace);
  }

  /**
   * Check if there are chePlugins in the current devfile
   */
  async hasPlugins(): Promise<boolean> {
    const plugins = await this.getPlugins();
    return plugins.length > 0;
  }

  /**
   * Grab all plugins of the devfile
   */
  async getPlugins(): Promise<string[]> {
    const cheWorkspace = await this.getWorkspace();
    const devfile = cheWorkspace.devfile;
    const devfilePlugins: string[] = [];
    if (devfile && devfile.components) {
      devfile.components.forEach(component => {
        let id = component.id;
        if (id && component.type === 'chePlugin') {
          if (id.endsWith('/latest')) {
            id = id.substring(0, id.length - '/latest'.length);
          }
          devfilePlugins.push(id);
        }
      });
    }
    return devfilePlugins;
  }

  async timeout(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add che plug-ins to the current devfile
   * Can throw an error when updating the workspace
   */
  async addPlugins(pluginIds: string[]): Promise<void> {
    const workspace = await this.getWorkspace();
    // always an id
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workspaceId = workspace.id!;
    // always has a devfile now
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const devfile = workspace.devfile!;

    const components: cheApi.workspace.devfile.Component[] = devfile.components || [];
    pluginIds.forEach(plugin => components.push({ id: `${plugin}/latest`, type: 'chePlugin' }));
    // use the new components
    devfile.components = components;

    // can throw an error
    await che.workspace.update(workspaceId, workspace);
    // retry the update few seconds after
    this.timeout(2000);
    await che.workspace.update(workspaceId, workspace);
  }

  protected async getWorkspace(): Promise<cheApi.workspace.Workspace> {
    return che.workspace.getCurrentWorkspace();
  }
}
