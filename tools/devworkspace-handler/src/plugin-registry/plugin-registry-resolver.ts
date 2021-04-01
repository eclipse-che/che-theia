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

import { inject, injectable, named } from 'inversify';

import { UrlFetcher } from '../fetch/url-fetcher';
import { VSCodeExtensionEntry } from '../api/vscode-extension-entry';

/**
 * Definition of the theia plug-in
 */
interface CheTheiaPluginYaml {
  metadata: {
    id: string;
    name: string;
    publisher: string;
  };
  sidecar: {
    name?: string;
    image: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences?: { [key: string]: any };
  dependencies?: string[];
  extensions: string[];
}

/**
 * Resolve plug-ins by grabbing the definition from the plug-in registry.
 */
@injectable()
export class PluginRegistryResolver {
  @inject('string')
  @named('PLUGIN_REGISTRY_URL')
  private pluginRegistryUrl: string;

  @inject(UrlFetcher)
  private urlFetcher: UrlFetcher;

  async resolve(vSCodeExtensionEntries: VSCodeExtensionEntry[]): Promise<void> {
    // resolve extensions references
    await Promise.all(vSCodeExtensionEntries.map(entry => this.resolveEntry(entry)));

    // now resolved dependencies
    await this.resolveDependencies(vSCodeExtensionEntries);
  }

  // Iterate on dependencies
  async resolveDependencies(vSCodeExtensionEntries: VSCodeExtensionEntry[]): Promise<void> {
    // list of all dependencies
    const allDependencies = vSCodeExtensionEntries
      .map(extension => extension.dependencies || [])
      // flatten the array of array
      .reduce((acc, val) => acc.concat(val), []);

    const uniqueDependencies = [...new Set(allDependencies)];

    // list of all dependencies not yet analyzed (because not yet in the list)
    const toAnalyzeDependenciesIds = uniqueDependencies.filter(
      dependency => !vSCodeExtensionEntries.some(entry => entry.id === `${dependency.replace(/\./g, '/')}/latest`)
    );

    // map new dependencies
    const toAnalyzeDependencies = toAnalyzeDependenciesIds.map(name => ({
      id: `${name.replace(/\./g, '/')}/latest`,
      resolved: false,
      optional: true,
      extensions: [],
    }));

    // resolve these new dependencies
    await Promise.all(toAnalyzeDependencies.map(entry => this.resolveEntry(entry)));

    // add new extensions being resolved
    vSCodeExtensionEntries.push(...toAnalyzeDependencies);

    // new dependencies, check again if new dependencies are there
    if (toAnalyzeDependencies.length > 0) {
      await this.resolveDependencies(vSCodeExtensionEntries);
    }
  }

  // FQN id (like eclipse/che-theia/next)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async loadDevfilePlugin(devfileId: string): Promise<any> {
    const devfileUrl = `${this.pluginRegistryUrl}/plugins/${devfileId}/devfile.yaml`;
    const devfileContent = await this.urlFetcher.fetchText(devfileUrl);
    return jsYaml.load(devfileContent);
  }

  // check if extension is not resolved
  // if not, reach plugin-registry
  async resolveEntry(vSCodeExtensionEntry: VSCodeExtensionEntry): Promise<void> {
    // skip already resolved
    if (vSCodeExtensionEntry.resolved === true) {
      return;
    }

    // grab the content from the plugin registry
    // plugin registry url is with the format "https://plugin-registry.com/v3"
    const url = `${this.pluginRegistryUrl}/plugins/${vSCodeExtensionEntry.id}/che-theia-plugin.yaml`;

    // let's propagate the error if the plugin definition does not exist
    const cheTheiaPluginYamlContent = await this.urlFetcher.fetchTextOptionalContent(url);
    if (!cheTheiaPluginYamlContent) {
      if (vSCodeExtensionEntry.optional === true) {
        console.error(
          `${vSCodeExtensionEntry.id} is missing on the plug-in registry but it is flagged as optional, skipping it`
        );
        return;
      } else {
        throw new Error(
          `${vSCodeExtensionEntry.id} is a mandatory plug-in but definition is not found on the plug-in registry. Aborting !`
        );
      }
    }
    const cheTheiaPluginYaml: CheTheiaPluginYaml = jsYaml.load(cheTheiaPluginYamlContent);

    // resolve now the extension
    vSCodeExtensionEntry.resolved = true;

    vSCodeExtensionEntry.extensions = cheTheiaPluginYaml.extensions;
    const sidecar = cheTheiaPluginYaml.sidecar;
    if (sidecar) {
      vSCodeExtensionEntry.sidecarName = sidecar.name;
      delete sidecar.name;
    }
    vSCodeExtensionEntry.sidecar = sidecar;
    vSCodeExtensionEntry.preferences = cheTheiaPluginYaml.preferences;
    vSCodeExtensionEntry.dependencies = cheTheiaPluginYaml.dependencies;
  }
}
