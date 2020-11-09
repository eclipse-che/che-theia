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

import { LanguageInformation } from './language-information';
import { VSCodeExtensionsInstalledLanguages as VSCodeCurrentExtensionsLanguages } from './vscode-extensions-installed-languages';
import { injectable } from 'inversify';

/**
 * Allow to grab information on VS Code extensions that are installed.
 */
@injectable()
export class VSCodeCurrentExtensions {
  async analyze(): Promise<VSCodeCurrentExtensionsLanguages> {
    // Map between file extension and language Id
    const languagesByFileExtensions = new Map<string, string[]>();

    // Map between a language Id and the extension's Ids
    const vscodeExtensionByLanguageId = new Map<string, string[]>();

    theia.plugins.all.forEach(plugin => {
      // populate map between a file extension and the language Id
      const contributes = plugin.packageJSON.contributes || { languages: [] };
      const languages: LanguageInformation[] = contributes.languages || [];
      languages.forEach(language => {
        const languageId = language.id;
        if (languageId) {
          const fileExtensions = language.extensions || [];
          fileExtensions.forEach(fileExtension => {
            let existingLanguageIds = languagesByFileExtensions.get(fileExtension);
            if (!existingLanguageIds) {
              existingLanguageIds = [];
              languagesByFileExtensions.set(fileExtension, existingLanguageIds);
            }
            if (!existingLanguageIds.includes(languageId)) {
              existingLanguageIds.push(languageId);
            }
          });
        }
      });

      // populate map between a language Id and a plug-in's Id
      const activationEvents: string[] = plugin.packageJSON.activationEvents || [];
      activationEvents.forEach(activationEvent => {
        if (activationEvent.startsWith('onLanguage:')) {
          const languageId = activationEvent.substring('onLanguage:'.length);
          let existingPlugins = vscodeExtensionByLanguageId.get(languageId);
          if (!existingPlugins) {
            existingPlugins = [];
            vscodeExtensionByLanguageId.set(languageId, existingPlugins);
          }
          if (!existingPlugins.includes(plugin.id)) {
            existingPlugins.push(plugin.id);
          }
        }
      });
    });

    return { languagesByFileExtensions, vscodeExtensionByLanguageId };
  }
}
