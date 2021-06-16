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

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { ChePluginRegistry } from '../../src/registry/che-plugin-registry';
import { Container } from 'inversify';
import { PluginsByLanguageFetcher } from '../../src/fetch/plugins-by-language-fetcher';

describe('Test PluginsByLanguageFetcher', () => {
  let container: Container;

  const chePluginRegistryGetUrlMock = jest.fn();
  const chePluginRegistry = {
    getUrl: chePluginRegistryGetUrlMock,
  } as any;
  const fakeUrl = 'https://my.registry/v3';

  beforeEach(() => {
    container = new Container();
    container.bind(ChePluginRegistry).toConstantValue(chePluginRegistry);
    (che as any).__clearHttpMocks();
    container.bind(PluginsByLanguageFetcher).toSelf().inSingletonScope();
    chePluginRegistryGetUrlMock.mockResolvedValue(fakeUrl);
  });

  test('check with language being there', async () => {
    const json = await fs.readFile(path.join(__dirname, '..', '_data', 'fetch', 'language-go.json'), 'utf8');
    (che as any).__setHttpContent('https://my.registry/v3/che-theia/recommendations/language/go.json', json);

    const pluginsByLanguageFetcher = container.get(PluginsByLanguageFetcher);
    const languagesByPlugins = await pluginsByLanguageFetcher.fetch('go');
    expect(languagesByPlugins).toBeDefined();
    expect(languagesByPlugins.length).toBe(5);
    const programmingLanguages = languagesByPlugins.filter(plugin => plugin.category === 'Programming Languages');
    expect(programmingLanguages.length).toBe(1);
    expect(programmingLanguages[0].ids).toEqual(['golang/go/latest']);
  });

  test('check with language not being there', async () => {
    (che as any).__setHttpContent('https://my.registry/v3/che-theia/recommendations/language/foo.json', undefined);

    const pluginsByLanguageFetcher = container.get(PluginsByLanguageFetcher);
    const languagesByPlugins = await pluginsByLanguageFetcher.fetch('foo');
    expect(languagesByPlugins).toBeDefined();
    expect(languagesByPlugins.length).toBe(0);
    expect(theia.window.showInformationMessage as jest.Mock).toBeCalledTimes(0);
  });

  test('unexpected error', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    (che as any).__setHttpContentError('https://my.registry/v3/che-theia/recommendations/language/java.json', error);

    const pluginsByLanguageFetcher = container.get(PluginsByLanguageFetcher);
    const languageByPlugins = await pluginsByLanguageFetcher.fetch('java');
    // no content
    expect(languageByPlugins).toBeDefined();
    expect(languageByPlugins.length).toBe(0);
    // notify the user
    expect(theia.window.showErrorMessage as jest.Mock).toBeCalled();
  });
});
