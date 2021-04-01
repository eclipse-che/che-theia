/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as jsoncparser from 'jsonc-parser';

import { VSCodeExtensionEntry } from '../api/vscode-extension-entry';
import { injectable } from 'inversify';

/**
 * This class manages extraction of VS Code extensions id from the .vscode/extensions.json file content
 * All extensions are optional, meaning that if the plug-in registry does not contain them, it won't fail
 */
@injectable()
export class VscodeExtensionJsonAnalyzer {
  async extractPlugins(vscodeExtensionsJsonContent: string): Promise<VSCodeExtensionEntry[]> {
    // use of JSONC parser as we have comments in the VS code json file
    const strippedContent = jsoncparser.stripComments(vscodeExtensionsJsonContent);
    const vscodeExtensionsJson = jsoncparser.parse(strippedContent);
    // no recommendations or invalid entry
    if (!vscodeExtensionsJson?.recommendations) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return vscodeExtensionsJson.recommendations.map((recommendation: string) => ({
      id: `${recommendation.replace(/\./g, '/')}/latest`.toLocaleLowerCase(),
      resolved: false,
      optional: true,
      extensions: [],
    }));
  }
}
