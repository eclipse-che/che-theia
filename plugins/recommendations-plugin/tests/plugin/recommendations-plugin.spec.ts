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

import * as theia from '@theia/plugin';

import { Container } from 'inversify';
import { DevfileHandler } from '../../src/devfile/devfile-handler';
import { FeaturedFetcher } from '../../src/fetch/featured-fetcher';
import { FeaturedPluginStrategy } from '../../src/strategy/featured-plugin-strategy';
import { FindFileExtensions } from '../../src/find/find-file-extensions';
import { RecommendPluginOpenFileStrategy } from '../../src/strategy/recommend-plugin-open-file-strategy';
import { RecommendationsPlugin } from '../../src/plugin/recommendations-plugin';
import { VSCodeCurrentExtensions } from '../../src/analyzer/vscode-current-extensions';
import { WorkspaceHandler } from '../../src/workspace/workspace-handler';

describe('Test recommendation Plugin', () => {
  let container: Container;

  const findFileExtensions = {
    find: jest.fn(),
  } as any;

  const vsCodeCurrentExtensionsContent = {
    languagesByFileExtensions: new Map(),
    vscodeExtensionByLanguageId: new Map(),
  };
  const analyzeVsCodeCurrentExtensionsMethod = jest.fn();
  const vsCodeCurrentExtensions = {
    analyze: analyzeVsCodeCurrentExtensionsMethod,
  } as any;

  const featuredFetcher = {
    fetch: jest.fn(),
  } as any;

  const devfileHandlerGetPluginsMock = jest.fn();
  const devfileHandlerHasPluginsMock = jest.fn();
  const devfileHandlerAddPluginsMock = jest.fn();
  const devfileHandlerIsRecommendedExtensionsDisabledMock = jest.fn();
  const devfileHandlerIsRecommendedExtensionsOpenFileEnabledMock = jest.fn();
  const devfileHandler = {
    addPlugins: devfileHandlerAddPluginsMock,
    getPlugins: devfileHandlerGetPluginsMock,
    hasPlugins: devfileHandlerHasPluginsMock,
    isRecommendedExtensionsOpenFileEnabled: devfileHandlerIsRecommendedExtensionsOpenFileEnabledMock,
    isRecommendedExtensionsDisabled: devfileHandlerIsRecommendedExtensionsDisabledMock,
  } as any;

  const restartWorkspaceHandlerMock = jest.fn();
  const workspaceHandler = {
    restart: restartWorkspaceHandlerMock,
  };

  const getFeaturedPluginsMock = jest.fn();
  const featuredPluginStrategy = {
    getFeaturedPlugins: getFeaturedPluginsMock,
  } as any;

  const onOpenFileRecommendPluginOpenFileStrategyStrategyMock = jest.fn();
  const recommendPluginOpenFileStrategy = {
    onOpenFile: onOpenFileRecommendPluginOpenFileStrategyStrategyMock,
  } as any;

  const workspacePluginMock = {
    exports: {
      onDidCloneSources: jest.fn(),
    },
  };

  const outputChannelMock = {
    appendLine: jest.fn(),
  };

  beforeEach(() => {
    container = new Container();
    jest.resetAllMocks();
    container.bind(FeaturedPluginStrategy).toConstantValue(featuredPluginStrategy);
    container.bind(RecommendPluginOpenFileStrategy).toConstantValue(recommendPluginOpenFileStrategy);
    container.bind(WorkspaceHandler).toConstantValue(workspaceHandler);
    container.bind(DevfileHandler).toConstantValue(devfileHandler);
    container.bind(VSCodeCurrentExtensions).toConstantValue(vsCodeCurrentExtensions);
    container.bind(FeaturedFetcher).toConstantValue(featuredFetcher);
    container.bind(FindFileExtensions).toConstantValue(findFileExtensions);
    container.bind(RecommendationsPlugin).toSelf().inSingletonScope();
    getFeaturedPluginsMock.mockReturnValue([]);
    devfileHandlerGetPluginsMock.mockReturnValue([]);
    analyzeVsCodeCurrentExtensionsMethod.mockReturnValue(vsCodeCurrentExtensionsContent);
    (theia.window.createOutputChannel as jest.Mock).mockReturnValue(outputChannelMock);
  });

  test('Check onClone callback is not called if workspacePlugin is not there', async () => {
    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const spyAfterClone = jest.spyOn(recommendationsPlugin, 'afterClone');

    await recommendationsPlugin.start();
    expect(workspacePluginMock.exports.onDidCloneSources).toBeCalledTimes(0);
    expect(spyAfterClone).toBeCalledTimes(0);
  });

  test('Check onClone callback is registered', async () => {
    (theia.plugins.getPlugin as jest.Mock).mockReturnValue(workspacePluginMock);
    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const spyAfterClone = jest.spyOn(recommendationsPlugin, 'afterClone');

    await recommendationsPlugin.start();
    expect(workspacePluginMock.exports.onDidCloneSources).toBeCalled();
    const onDidCloneSourceCalback = workspacePluginMock.exports.onDidCloneSources.mock.calls[0];

    const anonymousFunctionCallback = onDidCloneSourceCalback[0];
    expect(spyAfterClone).toBeCalledTimes(0);
    await anonymousFunctionCallback();
    expect(spyAfterClone).toBeCalled();
  });

  test('Check featuredPlugins with no plugins in the devfile', async () => {
    (theia.plugins.getPlugin as jest.Mock).mockReturnValue(workspacePluginMock);

    // no devfile plugins
    devfileHandlerHasPluginsMock.mockReturnValue(false);

    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const spyInstallPlugins = jest.spyOn(recommendationsPlugin, 'installPlugins');
    expect(spyInstallPlugins).toBeCalledTimes(0);

    getFeaturedPluginsMock.mockReset();
    getFeaturedPluginsMock.mockResolvedValue(['redhat/java']);

    await recommendationsPlugin.start();
    // call the callback
    await workspacePluginMock.exports.onDidCloneSources.mock.calls[0][0]();
    expect(spyInstallPlugins).toBeCalled();
    expect(spyInstallPlugins.mock.calls[0][0]).toEqual(['redhat/java']);

    // check restart callback is called
    expect(restartWorkspaceHandlerMock).toBeCalled();
    expect(restartWorkspaceHandlerMock.mock.calls[0][0]).toContain(
      'have been added to your workspace to improve the intellisense'
    );
  });

  test('Check featuredPlugins with no plugins in the devfile with error in install plug-ins', async () => {
    (theia.plugins.getPlugin as jest.Mock).mockReturnValue(workspacePluginMock);

    // no devfile plugins
    devfileHandlerHasPluginsMock.mockReturnValue(false);

    const recommendationsPlugin = container.get(RecommendationsPlugin);
    getFeaturedPluginsMock.mockReset();
    getFeaturedPluginsMock.mockResolvedValue(['redhat/java']);

    devfileHandlerAddPluginsMock.mockRejectedValue('Unable to install plug-ins');

    await recommendationsPlugin.start();
    // call the callback
    await workspacePluginMock.exports.onDidCloneSources.mock.calls[0][0]();

    // restart not called due to the error
    expect(restartWorkspaceHandlerMock).toBeCalledTimes(0);
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    expect(showInformationMessageMock.mock.calls[0][0]).toContain('Unable to add featured plugins');
  });

  test('Check featuredPlugins with plugins (but not related to suggested) in the devfile (user click Yes on suggestion)', async () => {
    (theia.plugins.getPlugin as jest.Mock).mockReturnValue(workspacePluginMock);

    // no devfile plugins
    devfileHandlerHasPluginsMock.mockReturnValue(true);

    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const spyInstallPlugins = jest.spyOn(recommendationsPlugin, 'installPlugins');
    expect(spyInstallPlugins).toBeCalledTimes(0);

    await recommendationsPlugin.start();

    // user click on yes, I want to install recommendations
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    showInformationMessageMock.mockResolvedValue({ title: 'Yes' });

    getFeaturedPluginsMock.mockReset();
    getFeaturedPluginsMock.mockResolvedValue(['redhat/java']);

    // call the callback
    await workspacePluginMock.exports.onDidCloneSources.mock.calls[0][0]();
    expect(showInformationMessageMock).toBeCalled();
    expect(showInformationMessageMock.mock.calls[0][0]).toContain('Do you want to install the recommended extensions');

    expect(spyInstallPlugins).toBeCalled();
  });

  test('Check featuredPlugins with suggested plugins already in the devfile', async () => {
    (theia.plugins.getPlugin as jest.Mock).mockReturnValue(workspacePluginMock);

    // no devfile plugins
    devfileHandlerHasPluginsMock.mockReturnValue(true);

    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const spyInstallPlugins = jest.spyOn(recommendationsPlugin, 'installPlugins');
    expect(spyInstallPlugins).toBeCalledTimes(0);

    const suggestedAndInDevfilePlugin = 'redhat/java';
    devfileHandlerGetPluginsMock.mockReset();
    devfileHandlerGetPluginsMock.mockResolvedValue([suggestedAndInDevfilePlugin]);
    await recommendationsPlugin.start();

    // user click on yes, I want to install recommendations
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    showInformationMessageMock.mockResolvedValue({ title: 'Yes' });

    getFeaturedPluginsMock.mockReset();
    getFeaturedPluginsMock.mockResolvedValue([suggestedAndInDevfilePlugin]);

    // call the clone callback
    await workspacePluginMock.exports.onDidCloneSources.mock.calls[0][0]();

    // nothing should be suggested as we already have this plug-in
    expect(showInformationMessageMock).toBeCalledTimes(0);
    expect(spyInstallPlugins).toBeCalledTimes(0);
  });

  test('Check featuredPlugins with plugins in the devfile (user click no on suggestion)', async () => {
    (theia.plugins.getPlugin as jest.Mock).mockReturnValue(workspacePluginMock);

    // no devfile plugins
    devfileHandlerHasPluginsMock.mockReturnValue(true);

    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const spyInstallPlugins = jest.spyOn(recommendationsPlugin, 'installPlugins');
    expect(spyInstallPlugins).toBeCalledTimes(0);

    await recommendationsPlugin.start();

    // user click on yes, I want to install recommendations
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    showInformationMessageMock.mockResolvedValue({ title: 'No' });

    getFeaturedPluginsMock.mockReset();
    getFeaturedPluginsMock.mockResolvedValue(['redhat/java']);

    // call the callback
    await workspacePluginMock.exports.onDidCloneSources.mock.calls[0][0]();
    expect(showInformationMessageMock).toBeCalled();
    expect(showInformationMessageMock.mock.calls[0][0]).toContain('Do you want to install the recommended extensions');

    // we never install plug-ins
    expect(spyInstallPlugins).toBeCalledTimes(0);
  });

  test('Check recommendation when opening files', async () => {
    // no devfile plugins
    devfileHandlerHasPluginsMock.mockReturnValue(false);
    devfileHandlerIsRecommendedExtensionsOpenFileEnabledMock.mockReturnValue(true);
    const recommendationsPlugin = container.get(RecommendationsPlugin);

    await recommendationsPlugin.start();
    const onDidOpenTextDocumentMethodCalback = (theia.workspace.onDidOpenTextDocument as jest.Mock).mock.calls[0];

    // call the callback
    await onDidOpenTextDocumentMethodCalback[0]();

    // check onOpenFile is being called
    expect(onOpenFileRecommendPluginOpenFileStrategyStrategyMock).toBeCalled();
  });

  test('Skip recommendation if flag is in devfile', async () => {
    devfileHandlerIsRecommendedExtensionsDisabledMock.mockResolvedValue(true);

    const recommendationsPlugin = container.get(RecommendationsPlugin);
    const enableRecommendationsPluginMethod = jest.spyOn(recommendationsPlugin, 'enableRecommendationsPlugin');

    await recommendationsPlugin.start();
    // never call the enable method
    expect(enableRecommendationsPluginMethod).toBeCalledTimes(0);
  });
});
