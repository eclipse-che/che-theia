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
import { V1alpha2DevWorkspaceTemplateSpec } from '@devfile/api/model/v1alpha2DevWorkspaceTemplateSpec';

describe('Test Generate', () => {
  let container: Container;

  let generate: Generate;

  const getContentUrlMethod = jest.fn();
  const getCloneUrlMethod = jest.fn();
  const getRepoNameMethod = jest.fn();
  const getBranchNameMethod = jest.fn();
  const githubUrlMock = {
    getContentUrl: getContentUrlMethod,
    getCloneUrl: getCloneUrlMethod,
    getRepoName: getRepoNameMethod,
    getBranchName: getBranchNameMethod,
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

  let editorDevfile = {};

  const devfileUrl = 'https://github.com/org/devfile-repo/tree/branch';
  const fakeoutputDir = '/fake-output';
  const editor = 'my/editor/latest';

  /* eslint-disable @typescript-eslint/no-explicit-any */
  let fsWriteFileSpy: any;

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

    editorDevfile = {
      schemaVersion: '2.1.0',
      metadata: {
        name: 'theia-ide',
      },
      commands: [],
    };

    urlFetcherFetchTextMethod.mockResolvedValue(jsYaml.dump({ metadata: {} }));
    fsWriteFileSpy = jest.spyOn(fs, 'writeFile');
    fsWriteFileSpy.mockReturnValue();

    generate = container.get(Generate);
  });

  test('basics', async () => {
    pluginRegistryResolverLoadDevfilePluginMethod.mockResolvedValue(editorDevfile);

    const rawDevfileUrl = 'https://content-of-devfile.url';
    getContentUrlMethod.mockReturnValue(rawDevfileUrl);
    getBranchNameMethod.mockReturnValue('HEAD');

    await generate.generate(devfileUrl, editor, SidecarPolicy.USE_DEV_CONTAINER, fakeoutputDir);
    expect(urlFetcherFetchTextMethod).toBeCalledWith(rawDevfileUrl);

    // expect to write the file
    expect(fsWriteFileSpy).toBeCalled();
  });

  test('generate template with default project', async () => {
    //given
    const pluginRegistryResolverSpy = jest.spyOn(pluginRegistryResolver, 'loadDevfilePlugin');
    pluginRegistryResolverSpy.mockResolvedValue(editorDevfile);

    getCloneUrlMethod.mockReturnValue('https://github.com/org/repo.git');
    getRepoNameMethod.mockReturnValue('test-repo');
    getBranchNameMethod.mockReturnValue('test-branch');

    //when
    await generate.generate(devfileUrl, editor, SidecarPolicy.USE_DEV_CONTAINER, fakeoutputDir);

    //then
    expect((editorDevfile as V1alpha2DevWorkspaceTemplateSpec).projects).toStrictEqual([
      {
        name: 'test-repo',
        git: { remotes: { origin: 'https://github.com/org/repo.git', checkoutFrom: 'test-branch' } },
      },
    ]);
  });

  test('generate template with defined project', async () => {
    //given
    const pluginRegistryResolverSpy = jest.spyOn(pluginRegistryResolver, 'loadDevfilePlugin');
    pluginRegistryResolverSpy.mockResolvedValue(editorDevfile);

    //when
    await generate.generate(devfileUrl, editor, SidecarPolicy.USE_DEV_CONTAINER, fakeoutputDir, {
      name: 'test-name',
      location: 'test-location',
    });

    //then
    expect((editorDevfile as V1alpha2DevWorkspaceTemplateSpec).projects).toStrictEqual([
      { name: 'test-name', zip: { location: 'test-location' } },
    ]);
  });
});
