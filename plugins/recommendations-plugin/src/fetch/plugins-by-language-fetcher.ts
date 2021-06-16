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

import { inject, injectable } from 'inversify';

import { ChePluginRegistry } from '../registry/che-plugin-registry';
import { LanguagePlugins } from './language-plugins';

@injectable()
export class PluginsByLanguageFetcher {
  @inject(ChePluginRegistry)
  private chePluginRegistry: ChePluginRegistry;

  async fetch(languageId: string): Promise<LanguagePlugins[]> {
    let languagePlugins: LanguagePlugins[] = [];

    const pluginRegistryUrl = await this.chePluginRegistry.getUrl();
    // need to fetch
    try {
      const response = await che.http.get(`${pluginRegistryUrl}/che-theia/recommendations/language/${languageId}.json`);
      if (response === undefined) {
        return [];
      }
      languagePlugins = JSON.parse(response);
    } catch (error) {
      theia.window.showErrorMessage(`Error while fetching featured recommendations ${error}`);
    }
    return languagePlugins;
  }
}
