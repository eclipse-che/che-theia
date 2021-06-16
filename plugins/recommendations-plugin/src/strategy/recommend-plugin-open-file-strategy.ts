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

import { inject, injectable } from 'inversify';

import { DevfileHandler } from '../devfile/devfile-handler';
import { PluginsByLanguageFetcher } from '../fetch/plugins-by-language-fetcher';
import { RecommendationsPluginAnalysis } from '../plugin/recommendations-plugin-analysis';
import { WorkspaceHandler } from '../workspace/workspace-handler';

/**
 * Provides recommendation when a file is being opened.
 */
@injectable()
export class RecommendPluginOpenFileStrategy {
  @inject(PluginsByLanguageFetcher)
  private pluginsByLanguageFetcher: PluginsByLanguageFetcher;

  @inject(DevfileHandler)
  private devfileHandler: DevfileHandler;

  @inject(WorkspaceHandler)
  private workspaceHandler: WorkspaceHandler;

  private alreadyNotifiedLanguageIds: string[];

  constructor() {
    this.alreadyNotifiedLanguageIds = [];
  }

  async onOpenFile(textDocument: theia.TextDocument, workspaceAnalysis: RecommendationsPluginAnalysis): Promise<void> {
    // language ID of the current file being opened
    const languageId = textDocument.languageId;

    // already analyzed, skip
    if (this.alreadyNotifiedLanguageIds.includes(languageId)) {
      return;
    }

    // current workspaces
    const workspacePaths = (theia.workspace.workspaceFolders || []).map(workspaceFolder => workspaceFolder.uri.path);

    // propose stuff only for files inside current workspace
    if (!workspacePaths.some(workspacePath => textDocument.fileName.startsWith(workspacePath))) {
      return;
    }

    const installedPlugins =
      workspaceAnalysis.vsCodeExtensionsInstalledLanguages.vscodeExtensionByLanguageId.get(languageId);

    // if we don't have plug-ins installed locally for this languageId, ask remotely
    if (!installedPlugins) {
      const remoteAvailablePlugins = await this.pluginsByLanguageFetcher.fetch(languageId);
      const recommendedPlugins: string[] = [];
      remoteAvailablePlugins.map(pluginCategory => {
        if (pluginCategory.category === 'Programming Languages') {
          pluginCategory.ids.forEach(id => {
            if (!recommendedPlugins.includes(id)) {
              recommendedPlugins.push(id);
            }
          });
        }
      });

      // users have existing plug-ins meaning that they probably started with a custom devfile, need to suggest and not add
      if (remoteAvailablePlugins.length > 0) {
        const doNotShowAgainValue = "Don't Show Again Recommendations";
        const install = 'Install...';
        const promptItems: theia.MessageItem[] = [{ title: install }, { title: doNotShowAgainValue }];
        const recommendationsPromptResult = await theia.window.showInformationMessage(
          `The plug-in registry has plug-ins that can help with '${languageId}' files: ${recommendedPlugins}`,
          ...promptItems
        );
        // install recommended plug-ins
        if (recommendationsPromptResult && recommendationsPromptResult.title === doNotShowAgainValue) {
          // do not show dialog again
          await this.devfileHandler.disableRecommendations();
        } else if (recommendationsPromptResult && recommendationsPromptResult.title === install) {
          // Issue https://github.com/eclipse-theia/theia/issues/5673
          // do not allow multi-select
          //   const quickPickItems: theia.QuickPickItem[] = recommendedPlugins.map(pluginId => ({
          //       label: `${pluginId}`,
          //       description: `Install plug-in ${pluginId}`,
          //       picked: true,
          //   }));

          //     const quickPickOptions : theia.QuickPickOptions = {canPickMany: true,
          //       placeHolder: `Select plug-ins to install`};
          //     const selectedItems = await theia.window.showQuickPick<theia.QuickPickItem>(quickPickItems, quickPickOptions);
          //   if (!selectedItems) {
          //     return;
          // }

          // install plug-ins
          await this.devfileHandler.addPlugins(recommendedPlugins);

          // restart the workspace ?
          await this.workspaceHandler.restart(
            `Plug-ins ${recommendedPlugins} have been added to your workspace. Please restart the workspace to see the changes.`
          );
        }
      }
    }
    // flag it as being analyzed
    this.alreadyNotifiedLanguageIds.push(languageId);
  }
}
