/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { VSCodeExtensionEntry, VSCodeExtensionEntryWithSidecar } from '../api/vscode-extension-entry';
import { inject, injectable } from 'inversify';

import { CheTheiaPluginDevContainerMerger } from './che-theia-plugin-devcontainer-merger';
import { CheTheiaPluginSidecarMerger } from './che-theia-plugin-sidecar-merger';
import { CheTheiaPluginsAnalyzer } from './che-theia-plugins-analyzer';
import { DevWorkspaceUpdater } from './devworkspace-updater';
import { DevfileContext } from '../api/devfile-context';
import { DevfileResolver } from '../api/devfile-che-theia-plugins-resolver';
import { PluginRegistryResolver } from '../plugin-registry/plugin-registry-resolver';
import { VSCodeExtensionDevContainer } from './vscode-extension-dev-container';
import { VscodeExtensionJsonAnalyzer } from './vscode-extension-json-analyzer';

/**
 * This class handle the che-theia-plugins attribute from within a devfile.
 * It will provide a set of set of DevWorkspace Templates and a map of attributes to add on some components.
 * New templates will be the optional 'sidecar' components, vsix downloader and extra map will contain for example the vscode extensions to add on che-theia IDE
 */
@injectable()
export class CheTheiaPluginsDevfileResolver implements DevfileResolver {
  @inject(VscodeExtensionJsonAnalyzer)
  private vscodeExtensionJsonAnalyzer: VscodeExtensionJsonAnalyzer;

  @inject(CheTheiaPluginsAnalyzer)
  private cheTheiaPluginsAnalyzer: CheTheiaPluginsAnalyzer;

  @inject(PluginRegistryResolver)
  private pluginRegistryResolver: PluginRegistryResolver;

  @inject(DevWorkspaceUpdater)
  private devWorkspaceUpdater: DevWorkspaceUpdater;

  @inject(CheTheiaPluginSidecarMerger)
  private cheTheiaPluginSidecarMerger: CheTheiaPluginSidecarMerger;

  @inject(CheTheiaPluginDevContainerMerger)
  private cheTheiaPluginDevContainerMerger: CheTheiaPluginDevContainerMerger;

  async handle(devfileContext: DevfileContext): Promise<void> {
    let cheTheiaPluginsYamlContent = devfileContext.cheTheiaPluginsContent;
    let vscodeExtensionJsonContent = devfileContext.vscodeExtensionsJsonContent;

    if (!vscodeExtensionJsonContent) {
      vscodeExtensionJsonContent = devfileContext.devfile.attributes?.['.vscode/extensions.json'];
    }

    if (!cheTheiaPluginsYamlContent) {
      cheTheiaPluginsYamlContent = devfileContext.devfile.attributes?.['.che/che-theia-plugins.yaml'];
    }

    // no content, skip
    if (!cheTheiaPluginsYamlContent && !vscodeExtensionJsonContent) {
      return;
    }

    // we do have '.vscode/extensions.json' file, grab plug-ins from there.
    let vscodeExtensions: VSCodeExtensionEntry[] = [];
    if (vscodeExtensionJsonContent) {
      vscodeExtensions = await this.vscodeExtensionJsonAnalyzer.extractPlugins(vscodeExtensionJsonContent);
    }

    let cheTheiaPlugins: VSCodeExtensionEntry[] = [];
    if (cheTheiaPluginsYamlContent) {
      cheTheiaPlugins = await this.cheTheiaPluginsAnalyzer.extractPlugins(cheTheiaPluginsYamlContent);
    }

    // now, need to merge
    // if defined in both vscode/extensions.json and che-theia-plugins.yaml file, che-theia-plugins.yaml is winning
    // if not defined, add definition from where it is defined

    // filter out extensions already defined in che-theia-plugins.yaml files
    const allExtensions = cheTheiaPlugins.concat(
      vscodeExtensions.filter(extension => !cheTheiaPlugins.find(cheTheiaPlugin => cheTheiaPlugin.id === extension.id))
    );

    // unique extensions
    const uniqueExtensions = [...new Set(allExtensions)];

    // resolve the given set of extensions (if needed) by grabbing definition using plug-in registry
    await this.pluginRegistryResolver.resolve(uniqueExtensions);

    // now we do have definition of all extensions that we want to add into Theia and their optional sidecars for these plug-ins.

    // grab a list of VS Code extensions to install on main che-theia instance (no sidecar)
    const cheTheiaExtensions = uniqueExtensions
      // get only extensions without sidecars
      .filter(entry => !entry.sidecar);

    // grab a list of extensions with sidecars
    const allExtensionsWithSidecars = uniqueExtensions
      .filter(entry => entry.sidecar)
      .map(entry => entry as VSCodeExtensionEntryWithSidecar);

    // do we need to change the sidecar and use a dev container instead ?
    // if need to use user container, we'll need to update an existing component with the following data

    let extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[] = [];

    // for dev container merge, we unify all extensions into a single sidecar and then we'll apply all settings except the image
    let extensionsForDevContainer: VSCodeExtensionDevContainer | undefined;

    switch (devfileContext.sidecarPolicy) {
      case 'mergeImage':
        extensionsWithSidecars = this.cheTheiaPluginSidecarMerger.merge(allExtensionsWithSidecars);
        break;
      case 'useDevContainer':
        extensionsForDevContainer = this.cheTheiaPluginDevContainerMerger.merge(allExtensionsWithSidecars);
        break;
    }

    // ok now we're ready to add the vsix on che-theia component, add component sidecars(if any) and vsix installer component, etc.
    await this.devWorkspaceUpdater.update(
      devfileContext,
      cheTheiaExtensions,
      extensionsWithSidecars,
      extensionsForDevContainer
    );
  }
}
