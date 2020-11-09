/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { Container } from 'inversify';
import { FeaturedPlugin } from '../../src/fetch/featured-plugin';
import { FeaturedPluginStrategy } from '../../src/strategy/featured-plugin-strategy';
import { FeaturedPluginStrategyRequest } from '../../src/strategy/feature-plugin-strategy-request';
import { VSCodeExtensionsInstalledLanguages } from '../../src/analyzer/vscode-extensions-installed-languages';

describe('Test FeaturedPluginStrategy', () => {
  let container: Container;

  const languagesByFileExtensions = new Map<string, string[]>();
  const vscodeExtensionByLanguageId = new Map<string, string[]>();

  const vsCodeExtensionsInstalledLanguages: VSCodeExtensionsInstalledLanguages = {
    languagesByFileExtensions,
    vscodeExtensionByLanguageId,
  };

  beforeEach(() => {
    languagesByFileExtensions.clear();
    vscodeExtensionByLanguageId.clear();
    container = new Container();
    container.bind(FeaturedPluginStrategy).toSelf().inSingletonScope();
  });

  test('basic java', async () => {
    const featuredPluginStrategy = container.get(FeaturedPluginStrategy);

    languagesByFileExtensions.set('.java', ['java']);
    vscodeExtensionByLanguageId.set('java', ['redhat/java']);

    const featured: FeaturedPlugin = {
      id: 'redhat/java',
      onLanguages: ['java'],
      workspaceContains: [],
      contributes: {
        languages: [
          {
            id: 'java',
            aliases: [],
            extensions: ['.java'],
            filenames: [],
          },
        ],
      },
    };
    const featuredList = [featured];
    const extensionsInCheWorkspace = ['.java'];
    const devfileHasPlugins = true;

    const request: FeaturedPluginStrategyRequest = {
      featuredList,
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      extensionsInCheWorkspace,
    };

    const featuredPlugins = await featuredPluginStrategy.getFeaturedPlugins(request);
    expect(featuredPlugins).toBeDefined();
    expect(featuredPlugins.length).toBe(1);
    expect(featuredPlugins[0]).toBe('redhat/java');
  });

  test('basic unknown language', async () => {
    const featuredPluginStrategy = container.get(FeaturedPluginStrategy);

    const featuredList: FeaturedPlugin[] = [];
    const extensionsInCheWorkspace = ['.java'];
    const devfileHasPlugins = true;

    const request: FeaturedPluginStrategyRequest = {
      featuredList,
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      extensionsInCheWorkspace,
    };

    const featuredPlugins = await featuredPluginStrategy.getFeaturedPlugins(request);
    expect(featuredPlugins).toBeDefined();
    expect(featuredPlugins.length).toBe(0);
  });

  test('basic featured without language', async () => {
    const featuredPluginStrategy = container.get(FeaturedPluginStrategy);

    languagesByFileExtensions.set('.java', ['java']);
    vscodeExtensionByLanguageId.set('java', ['redhat/java']);

    const featured: FeaturedPlugin = {
      id: 'redhat/java',
      workspaceContains: [],
      contributes: {
        languages: [
          {
            id: 'java',
            aliases: [],
            extensions: ['.java'],
            filenames: [],
          },
        ],
      },
    };
    const featuredList = [featured];

    const extensionsInCheWorkspace = ['.java'];
    const devfileHasPlugins = true;

    const request: FeaturedPluginStrategyRequest = {
      featuredList,
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      extensionsInCheWorkspace,
    };

    const featuredPlugins = await featuredPluginStrategy.getFeaturedPlugins(request);
    expect(featuredPlugins).toBeDefined();
    expect(featuredPlugins.length).toBe(0);
  });
});
