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

import * as jsYaml from 'js-yaml';

import { Container } from 'inversify';
import { PluginRegistryResolver } from '../../src/plugin-registry/plugin-registry-resolver';
import { UrlFetcher } from '../../src/fetch/url-fetcher';
import { VSCodeExtensionEntry } from '../../src/api/vscode-extension-entry';

describe('Test PluginRegistryResolver', () => {
  let container: Container;

  const originalConsoleError = console.error;
  const mockedConsoleError = jest.fn();

  const urlFetcherFetchTextMock = jest.fn();
  const urlFetcherFetchTextOptionalMock = jest.fn();
  const urlFetcher = {
    fetchText: urlFetcherFetchTextMock,
    fetchTextOptionalContent: urlFetcherFetchTextOptionalMock,
  } as any;

  let pluginRegistryResolver: PluginRegistryResolver;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(PluginRegistryResolver).toSelf().inSingletonScope();
    container.bind(UrlFetcher).toConstantValue(urlFetcher);
    container.bind('string').toConstantValue('http://fake-plugin-registry').whenTargetNamed('PLUGIN_REGISTRY_URL');
    pluginRegistryResolver = container.get(PluginRegistryResolver);
    console.error = mockedConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  test('basic resolve', async () => {
    const entries: VSCodeExtensionEntry[] = [];
    const unresolvedOptionalEntry: VSCodeExtensionEntry = {
      id: 'unresolved',
      resolved: false,
      optional: true,
      extensions: [],
      dependencies: [],
    };

    const resolvedEntry: VSCodeExtensionEntry = {
      id: 'resolved',
      resolved: true,
      optional: true,
      extensions: [],
      dependencies: [],
    };

    // first call mock
    const dummySidecarName = 'dummy-sidecar';
    const preferences = { hello: 'world' };
    const extensions = ['http://fake-vsix'];
    urlFetcherFetchTextOptionalMock.mockResolvedValueOnce(
      JSON.stringify({
        preferences,
        extensions,
        dependencies: ['dep1'],
        sidecar: {
          name: dummySidecarName,
        },
      })
    );
    // second call mock
    urlFetcherFetchTextOptionalMock.mockResolvedValueOnce(
      JSON.stringify({
        preferences,
      })
    );
    entries.push(unresolvedOptionalEntry, resolvedEntry);
    await pluginRegistryResolver.resolve(entries);
    expect(unresolvedOptionalEntry.sidecarName).toBe(dummySidecarName);
    expect(unresolvedOptionalEntry.preferences).toStrictEqual(preferences);
    expect(unresolvedOptionalEntry.extensions).toStrictEqual(extensions);
    expect(unresolvedOptionalEntry.resolved).toBeTruthy();

    // already resolved so we don't have anything being changed
    expect(resolvedEntry.sidecarName).toBeUndefined();
    expect(resolvedEntry.preferences).toBeUndefined();
    expect(resolvedEntry.resolved).toBeTruthy();
  });

  test('optional and missing in the registry', async () => {
    const entries: VSCodeExtensionEntry[] = [];
    const unresolvedOptionalEntry: VSCodeExtensionEntry = {
      id: 'unresolved',
      resolved: false,
      optional: true,
      extensions: [],
      dependencies: [],
    };

    entries.push(unresolvedOptionalEntry);
    await pluginRegistryResolver.resolve(entries);
    expect(mockedConsoleError).toBeCalledWith(
      expect.stringMatching(/is missing on the plug-in registry but it is flagged as optional/)
    );
  });

  test('mandatory and missing in the registry', async () => {
    const entries: VSCodeExtensionEntry[] = [];
    const unresolvedOptionalEntry: VSCodeExtensionEntry = {
      id: 'unresolved',
      resolved: false,
      optional: false,
      extensions: [],
      dependencies: [],
    };

    entries.push(unresolvedOptionalEntry);
    await expect(pluginRegistryResolver.resolve(entries)).rejects.toThrow(
      'is a mandatory plug-in but definition is not found on the plug-in registry'
    );
  });

  test('basic loadDevfilePlugin', async () => {
    const myId = 'foo';
    const dummy = { dummyContent: 'dummy' };
    urlFetcherFetchTextMock.mockResolvedValue(jsYaml.dump(dummy));
    const content = await pluginRegistryResolver.loadDevfilePlugin(myId);
    expect(urlFetcherFetchTextMock).toBeCalledWith('http://fake-plugin-registry/plugins/foo/devfile.yaml');
    expect(content).toStrictEqual(dummy);
  });
});
