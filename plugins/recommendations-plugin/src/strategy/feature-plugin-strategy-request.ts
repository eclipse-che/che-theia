/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { FeaturedPlugin } from '../fetch/featured-plugin';
import { VSCodeExtensionsInstalledLanguages } from '../analyzer/vscode-extensions-installed-languages';

export interface FeaturedPluginStrategyRequest {
  featuredList: FeaturedPlugin[];
  vsCodeExtensionsInstalledLanguages: VSCodeExtensionsInstalledLanguages;
  devfileHasPlugins: boolean;
  extensionsInCheWorkspace: string[];
}
