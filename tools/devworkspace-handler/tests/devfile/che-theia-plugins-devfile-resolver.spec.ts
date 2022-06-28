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

import { DevfileContext, SidecarPolicy } from '../../src/api/devfile-context';

import { CheTheiaPluginDevContainerMerger } from '../../src/devfile/che-theia-plugin-devcontainer-merger';
import { CheTheiaPluginSidecarMerger } from '../../src/devfile/che-theia-plugin-sidecar-merger';
import { CheTheiaPluginsAnalyzer } from '../../src/devfile/che-theia-plugins-analyzer';
import { CheTheiaPluginsDevfileResolver } from '../../src/devfile/che-theia-plugins-devfile-resolver';
import { Container } from 'inversify';
import { DevWorkspaceUpdater } from '../../src/devfile/devworkspace-updater';
import { PluginRegistryResolver } from '../../src/plugin-registry/plugin-registry-resolver';
import { UrlFetcher } from '../../src/fetch/url-fetcher';
import { VscodeExtensionJsonAnalyzer } from '../../src/devfile/vscode-extension-json-analyzer';

// import { VSCodeExtensionEntry, VSCodeExtensionEntryWithSidecar } from '../../src/api/vscode-extension-entry';

describe('Test CheTheiaPluginsDevfileResolver', () => {
  let container: Container;

  let cheTheiaPluginsDevfileResolver: CheTheiaPluginsDevfileResolver;

  const urlFetcherFetchTextOptionalContentMethod = jest.fn();
  const urlFetcher = {
    fetchTextOptionalContent: urlFetcherFetchTextOptionalContentMethod,
  } as any;

  let cheTheiaPluginsAnalyzer: CheTheiaPluginsAnalyzer;
  let vscodeExtensionJsonAnalyzer: VscodeExtensionJsonAnalyzer;
  let cheTheiaPluginSidecarMerger: CheTheiaPluginSidecarMerger;
  let cheTheiaPluginDevContainerMerger: CheTheiaPluginDevContainerMerger;

  const pluginRegistryResolverResolveMethod = jest.fn();
  const pluginRegistryResolver = {
    resolve: pluginRegistryResolverResolveMethod,
  } as any;

  const devWorkspaceUpdaterUpdateMethod = jest.fn();
  const devWorkspaceUpdater = {
    update: devWorkspaceUpdaterUpdateMethod,
  } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(CheTheiaPluginsDevfileResolver).toSelf().inSingletonScope();

    // use real implementation
    container.bind(CheTheiaPluginsAnalyzer).toSelf().inSingletonScope();
    container.bind(VscodeExtensionJsonAnalyzer).toSelf().inSingletonScope();
    container.bind(CheTheiaPluginSidecarMerger).toSelf().inSingletonScope();
    container.bind(CheTheiaPluginDevContainerMerger).toSelf().inSingletonScope();

    // mock
    container.bind(UrlFetcher).toConstantValue(urlFetcher);
    container.bind(PluginRegistryResolver).toConstantValue(pluginRegistryResolver);
    container.bind(DevWorkspaceUpdater).toConstantValue(devWorkspaceUpdater);

    cheTheiaPluginsDevfileResolver = container.get(CheTheiaPluginsDevfileResolver);
    cheTheiaPluginsAnalyzer = container.get(CheTheiaPluginsAnalyzer);
    vscodeExtensionJsonAnalyzer = container.get(VscodeExtensionJsonAnalyzer);
    cheTheiaPluginSidecarMerger = container.get(CheTheiaPluginSidecarMerger);
    cheTheiaPluginDevContainerMerger = container.get(CheTheiaPluginDevContainerMerger);
  });

  test('basics with mergeImage', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      sidecarPolicy: 'mergeImage',
      devfile: {},
      cheTheiaPluginsContent: '- id: my/first-plugin/latest',
      vscodeExtensionsJsonContent: JSON.stringify({
        recommendations: ['redhat.java', 'foo.java', 'foo.node'],
      }),
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];

      array[1].resolved = true;
      (array[1].sidecar = {
        image: 'foo-image',
      }),
        (array[1].extensions = ['http://redhat-java.vsix']);

      array[2].resolved = true;
      (array[2].sidecar = {
        image: 'foo-image',
      }),
        (array[2].extensions = ['http://foo-java.vsix']);

      array[3].resolved = true;
      (array[3].sidecar = {
        image: 'foo-node',
      }),
        (array[3].extensions = ['http://foo-node.vsix']);
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // analyze yaml or extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalled();
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalled();
    // but not useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe('mergeImage');

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // extensions with same sidecar should have been merged
    expect(updateCall[2].length).toBe(2);
    expect(updateCall[2][0].extensions).toStrictEqual(['http://redhat-java.vsix', 'http://foo-java.vsix']);
    expect(updateCall[2][0].sidecar.image).toBe('foo-image');

    expect(updateCall[2][1].extensions).toStrictEqual(['http://foo-node.vsix']);
    expect(updateCall[2][1].sidecar.image).toBe('foo-node');

    // nothing for dev container
    expect(updateCall[3]).toBeUndefined();
  });

  test('basics mergeImage only extensionJson attribute', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      sidecarPolicy: 'mergeImage',
      devfile: {
        attributes: {
          '.vscode/extensions.json': JSON.stringify({
            recommendations: ['first.plugin'],
          }),
        },
      },
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // no yaml
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalledTimes(0);
    // but extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalled();
    // but not useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe('mergeImage');

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // extensions with same sidecar should have been merged
    expect(updateCall[2].length).toBe(0);

    // nothing for dev container
    expect(updateCall[3]).toBeUndefined();
  });

  test('basics mergeImage only cheTheiaPlugins attribute', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      sidecarPolicy: 'mergeImage',
      devfile: {
        attributes: {
          '.che/che-theia-plugins.yaml': '- id: my/first-plugin/latest',
        },
      },
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // no extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalledTimes(0);
    // but yaml
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalled();
    // but not useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe('mergeImage');

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // extensions with same sidecar should have been merged
    expect(updateCall[2].length).toBe(0);

    // nothing for dev container
    expect(updateCall[3]).toBeUndefined();
  });

  test('basics mergeImage in attributes only cheTheiaPlugins attribute', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      devfile: {
        attributes: {
          '.che/che-theia-plugins.yaml': '- id: my/first-plugin/latest',
          'che-theia.eclipse.org/sidecar-policy': SidecarPolicy.MERGE_IMAGE,
        },
      },
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // no extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalledTimes(0);
    // but yaml
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalled();
    // but not useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe('mergeImage');

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // extensions with same sidecar should have been merged
    expect(updateCall[2].length).toBe(0);

    // nothing for dev container
    expect(updateCall[3]).toBeUndefined();
  });

  test('basics with useDevContainer', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      sidecarPolicy: SidecarPolicy.USE_DEV_CONTAINER,
      devfile: {},
      cheTheiaPluginsContent: '- id: my/first-plugin/latest',
      vscodeExtensionsJsonContent: JSON.stringify({
        recommendations: ['redhat.java'],
      }),
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];

      array[1].resolved = true;
      (array[1].sidecar = {
        image: 'foo-image',
      }),
        (array[1].extensions = ['http://redhat-java.vsix']);
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // analyze yaml or extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalled();
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalled();
    // but not mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe(SidecarPolicy.USE_DEV_CONTAINER);

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // no extensions with sidecar
    expect(updateCall[2].length).toBe(0);

    // dev container will deploy redhat-java.vsix
    expect(updateCall[3].extensions).toStrictEqual(['http://redhat-java.vsix']);
  });

  test('basics with useDevContainer in attributes', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      devfile: {
        attributes: {
          'che-theia.eclipse.org/sidecar-policy': 'useDevContainer',
        },
      },
      cheTheiaPluginsContent: '- id: my/first-plugin/latest',
      vscodeExtensionsJsonContent: JSON.stringify({
        recommendations: ['redhat.java'],
      }),
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];

      array[1].resolved = true;
      (array[1].sidecar = {
        image: 'foo-image',
      }),
        (array[1].extensions = ['http://redhat-java.vsix']);
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // analyze yaml or extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalled();
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalled();
    // but not mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe(SidecarPolicy.USE_DEV_CONTAINER);

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // no extensions with sidecar
    expect(updateCall[2].length).toBe(0);

    // dev container will deploy redhat-java.vsix
    expect(updateCall[3].extensions).toStrictEqual(['http://redhat-java.vsix']);
  });

  test('basics with useDevContainer with default sidecar policy (use dev container)', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      devfile: {},
      cheTheiaPluginsContent: '- id: my/first-plugin/latest',
      vscodeExtensionsJsonContent: JSON.stringify({
        recommendations: ['redhat.java'],
      }),
    } as DevfileContext;

    pluginRegistryResolverResolveMethod.mockImplementation(array => {
      array[0].resolved = true;
      array[0].extensions = ['http://first-plugin.vsix'];

      array[1].resolved = true;
      (array[1].sidecar = {
        image: 'foo-image',
      }),
        (array[1].extensions = ['http://redhat-java.vsix']);
    });

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // analyze yaml or extension.json
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalled();
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalled();

    // plug-ins will be fetched on the registry
    expect(pluginRegistryResolverResolveMethod).toBeCalled();

    // useDevContainer
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalled();
    // but not mergeImage
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalled();
    const updateCall = devWorkspaceUpdaterUpdateMethod.mock.calls[0];
    expect(updateCall[0].sidecarPolicy).toBe(SidecarPolicy.USE_DEV_CONTAINER);

    // extensions without sidecar:
    expect(updateCall[1].length).toBe(1);
    expect(updateCall[1][0].extensions).toStrictEqual(['http://first-plugin.vsix']);

    // no extensions with sidecar
    expect(updateCall[2].length).toBe(0);

    // dev container will deploy redhat-java.vsix
    expect(updateCall[3].extensions).toStrictEqual(['http://redhat-java.vsix']);
  });

  test('basics no content', async () => {
    const cheTheiaPluginsAnalyzerExtractPluginsSpy = jest.spyOn(cheTheiaPluginsAnalyzer, 'extractPlugins');
    const vscodeExtensionJsonAnalyzerExtractPluginsSpy = jest.spyOn(vscodeExtensionJsonAnalyzer, 'extractPlugins');
    const cheTheiaPluginSidecarMergerMergeSpy = jest.spyOn(cheTheiaPluginSidecarMerger, 'merge');
    const cheTheiaPluginDevContainerMergerMergeSpy = jest.spyOn(cheTheiaPluginDevContainerMerger, 'merge');

    const devfileContext = {
      devfile: {},
    } as DevfileContext;

    await cheTheiaPluginsDevfileResolver.handle(devfileContext);

    // we never analyze yaml or extension.json as it's not there
    expect(vscodeExtensionJsonAnalyzerExtractPluginsSpy).toBeCalledTimes(0);
    expect(cheTheiaPluginsAnalyzerExtractPluginsSpy).toBeCalledTimes(0);
    expect(pluginRegistryResolverResolveMethod).toBeCalledTimes(0);

    // no merge
    expect(cheTheiaPluginSidecarMergerMergeSpy).toBeCalledTimes(0);
    expect(cheTheiaPluginDevContainerMergerMergeSpy).toBeCalledTimes(0);

    // devWorkspace should be updated
    expect(devWorkspaceUpdaterUpdateMethod).toBeCalledTimes(1);
  });
});
