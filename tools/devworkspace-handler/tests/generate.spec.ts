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

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';

import { CheTheiaPluginsDevfileResolver } from '../src/devfile/che-theia-plugins-devfile-resolver';
import { Container } from 'inversify';
import { Generate } from '../src/generate';
import { GithubResolver } from '../src/github/github-resolver';
import { PluginRegistryResolver } from '../src/plugin-registry/plugin-registry-resolver';
import { SidecarPolicy } from '../src/api/devfile-context';
import { UrlFetcher } from '../src/fetch/url-fetcher';

describe('Test Generate', () => {
  let container: Container;

  let generate: Generate;

  const getContentUrlMethod = jest.fn();
  const githubUrlMock = {
    getContentUrl: getContentUrlMethod,
  };

  const urlFetcherFetchTextMethod = jest.fn();
  const urlFetcherFetchTextOptionalContentMethod = jest.fn();
  const urlFetcher = {
    fetchText: urlFetcherFetchTextMethod,
    fetchTextOptionalContent: urlFetcherFetchTextOptionalContentMethod,
  } as any;

  const githubResolverResolveMethod = jest.fn();
  const githubResolver = {
    resolve: githubResolverResolveMethod,
  } as any;

  const cheTheiaPluginsDevfileResolverHandleMethod = jest.fn();
  const cheTheiaPluginsDevfileResolver = {
    handle: cheTheiaPluginsDevfileResolverHandleMethod,
  } as any;

  const pluginRegistryResolverLoadDevfilePluginMethod = jest.fn();
  const pluginRegistryResolver = {
    loadDevfilePlugin: pluginRegistryResolverLoadDevfilePluginMethod,
  } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(Generate).toSelf().inSingletonScope();
    container.bind(UrlFetcher).toConstantValue(urlFetcher);
    container.bind(CheTheiaPluginsDevfileResolver).toConstantValue(cheTheiaPluginsDevfileResolver);
    container.bind(PluginRegistryResolver).toConstantValue(pluginRegistryResolver);
    container.bind(GithubResolver).toConstantValue(githubResolver);
    githubResolverResolveMethod.mockReturnValue(githubUrlMock);

    generate = container.get(Generate);
  });

  test('basics', async () => {
    pluginRegistryResolverLoadDevfilePluginMethod.mockResolvedValue({
      schemaVersion: '2.1.0',
      metadata: {
        name: 'theia-ide',
      },
      commands: [],
    });

    const devfileUrl = 'http://my-devfile-url';
    const fakeoutputDir = '/fake-output';
    const editor = 'my/editor/latest';

    const fsWriteFileSpy = jest.spyOn(fs, 'writeFile');
    fsWriteFileSpy.mockReturnValue();

    const rawDevfileUrl = 'https://content-of-devfile.url';
    getContentUrlMethod.mockReturnValue(rawDevfileUrl);

    urlFetcherFetchTextMethod.mockResolvedValue(jsYaml.dump({ metadata: {} }));

    await generate.generate(devfileUrl, editor, SidecarPolicy.USE_DEV_CONTAINER, fakeoutputDir);
    expect(urlFetcherFetchTextMethod).toBeCalledWith(rawDevfileUrl);

    // expect to write the file
    expect(fsWriteFileSpy).toBeCalled();
  });
});
