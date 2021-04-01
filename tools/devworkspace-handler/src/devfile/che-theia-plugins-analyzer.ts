/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as jsYaml from 'js-yaml';

import { VSCodeExtensionEntry } from '../api/vscode-extension-entry';
import { injectable } from 'inversify';

/**
 * This class needs to analyze the content of a local .che/che-theia-plugins.yaml file and grab different ids and optional parameters
 */
@injectable()
export class CheTheiaPluginsAnalyzer {
  async extractPlugins(cheTheiaPluginsYamlContent: string): Promise<VSCodeExtensionEntry[]> {
    // it's a yaml so convert it !
    const cheTheiaPluginsYamlInRepository = jsYaml.load(cheTheiaPluginsYamlContent);

    // only format supported right now is list of ids as for example:
    // - id: redhat/java8/latest

    if (cheTheiaPluginsYamlInRepository && Array.isArray(cheTheiaPluginsYamlInRepository)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return cheTheiaPluginsYamlInRepository.map(entry => ({
        id: entry.id,
        resolved: false,
        extensions: [],
      }));
    }

    // not able to really see the content, return something empty
    return [];
  }
}
