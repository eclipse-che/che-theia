/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { FeaturedPlugin } from '../fetch/featured-plugin';
import { FeaturedPluginStrategyRequest } from './feature-plugin-strategy-request';
import { injectable } from 'inversify';

/**
 * Strategy about infering the featured plug-ins based on what is currently available in the devfile, the plug-in registry and current plug-ins (could be built-in plug-ins, etc.)
 */
@injectable()
export class FeaturedPluginStrategy {
  private outputChannel: theia.OutputChannel;

  constructor() {
    this.outputChannel = theia.window.createOutputChannel('Recommendations Plug-in');
  }

  async getFeaturedPlugins(featurePluginStrategyRequest: FeaturedPluginStrategyRequest): Promise<string[]> {
    const foundLanguageIds = featurePluginStrategyRequest.extensionsInCheWorkspace
      .map(
        fileExtension =>
          featurePluginStrategyRequest.vsCodeExtensionsInstalledLanguages.languagesByFileExtensions.get(
            fileExtension
          ) || []
      )
      .reduce((acc, e) => acc.concat(e), []);

    this.outputChannel.appendLine(`getFeaturedPlugins.foundLanguageIds=${foundLanguageIds}`);

    // Now compare with what we have as plugin-registry recommendations
    const value = foundLanguageIds
      .map(languageId => this.matchingPlugins(languageId, featurePluginStrategyRequest.featuredList))
      .reduce((acc, e) => acc.concat(e), []);
    this.outputChannel.appendLine(`getFeaturedPlugins.value=${value}`);
    return value;
  }

  protected matchingPlugins(languageId: string, featuredList: FeaturedPlugin[]): string[] {
    const plugins: string[] = [];
    featuredList.forEach(featured => {
      const pluginId = featured.id;
      const languages: string[] = featured.onLanguages || [];
      if (languages.includes(languageId) && !plugins.includes(pluginId)) {
        plugins.push(pluginId);
      }
    });
    this.outputChannel.appendLine(
      `getFeaturedPlugins.matchingPlugins(${languageId}, ${JSON.stringify(
        featuredList,
        undefined,
        2
      )})=>return ${plugins}`
    );
    return plugins;
  }
}
