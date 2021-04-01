/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { ContainerModule, interfaces } from 'inversify';

import { CheTheiaComponentFinder } from './che-theia-component-finder';
import { CheTheiaComponentUpdater } from './che-theia-component-updater';
import { CheTheiaPluginDevContainerMerger } from './che-theia-plugin-devcontainer-merger';
import { CheTheiaPluginSidecarMerger } from './che-theia-plugin-sidecar-merger';
import { CheTheiaPluginsAnalyzer } from './che-theia-plugins-analyzer';
import { CheTheiaPluginsDevfileResolver } from './che-theia-plugins-devfile-resolver';
import { ContainerPluginRemoteUpdater } from './container-plugin-remote-updater';
import { DevContainerComponentFinder } from './dev-container-component-finder';
import { DevContainerComponentUpdater } from './dev-container-component-updater';
import { DevWorkspaceUpdater } from './devworkspace-updater';
import { SidecarComponentsCreator } from './sidecar-components-creator';
import { VscodeExtensionJsonAnalyzer } from './vscode-extension-json-analyzer';

const devfileModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(CheTheiaComponentFinder).toSelf().inSingletonScope();
  bind(CheTheiaComponentUpdater).toSelf().inSingletonScope();
  bind(CheTheiaPluginDevContainerMerger).toSelf().inSingletonScope();
  bind(CheTheiaPluginSidecarMerger).toSelf().inSingletonScope();
  bind(ContainerPluginRemoteUpdater).toSelf().inSingletonScope();
  bind(DevContainerComponentFinder).toSelf().inSingletonScope();
  bind(DevContainerComponentUpdater).toSelf().inSingletonScope();
  bind(CheTheiaPluginsDevfileResolver).toSelf().inSingletonScope();
  bind(DevWorkspaceUpdater).toSelf().inSingletonScope();
  bind(SidecarComponentsCreator).toSelf().inSingletonScope();
  bind(CheTheiaPluginsAnalyzer).toSelf().inSingletonScope();
  bind(VscodeExtensionJsonAnalyzer).toSelf().inSingletonScope();
});

export { devfileModule };
