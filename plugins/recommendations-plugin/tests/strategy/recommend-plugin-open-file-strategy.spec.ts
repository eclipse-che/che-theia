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
import { LanguagePlugins } from '../../src/fetch/language-plugins';
import { PluginsByLanguageFetcher } from '../../src/fetch/plugins-by-language-fetcher';
import { RecommendPluginOpenFileStrategy } from '../../src/strategy/recommend-plugin-open-file-strategy';
import { RecommendationsPluginAnalysis } from '../../src/plugin/recommendations-plugin-analysis';
import { VSCodeExtensionsInstalledLanguages } from '../../src/analyzer/vscode-extensions-installed-languages';
import { WorkspaceHandler } from '../../src/workspace/workspace-handler';

describe('Test RecommendPluginOpenFileStrategy', () => {
  let container: Container;

  const languagesByFileExtensions = new Map<string, string[]>();
  const vscodeExtensionByLanguageId = new Map<string, string[]>();
  const vsCodeExtensionsInstalledLanguages: VSCodeExtensionsInstalledLanguages = {
    languagesByFileExtensions,
    vscodeExtensionByLanguageId,
  };

  const installPluginsMock = jest.fn();
  const fetchMethodMock = jest.fn();
  const pluginsByLanguageFetcher = {
    fetch: fetchMethodMock,
  } as any;

  const devfileHandlerAddPluginsMock = jest.fn();
  const devfileHandlerDisableRecommendationsMock = jest.fn();
  const devfileHandler = {
    addPlugins: devfileHandlerAddPluginsMock,
    disableRecommendations: devfileHandlerDisableRecommendationsMock,
  } as any;

  const workspaceHandlerRestartMock = jest.fn();
  const workspaceHandler = {
    restart: workspaceHandlerRestartMock,
  } as any;

  beforeEach(() => {
    languagesByFileExtensions.clear();
    vscodeExtensionByLanguageId.clear();
    jest.resetAllMocks();
    container = new Container();
    container.bind(PluginsByLanguageFetcher).toConstantValue(pluginsByLanguageFetcher);
    container.bind(DevfileHandler).toConstantValue(devfileHandler);
    container.bind(WorkspaceHandler).toConstantValue(workspaceHandler);
    container.bind(RecommendPluginOpenFileStrategy).toSelf().inSingletonScope();
  });

  test('suggest java as no plug-in yet', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);

    const devfileHasPlugins = true;
    const workspaceFolder = { uri: { path: '/projects' } } as any;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    theia.workspace.workspaceFolders = workspaceFolders;
    const document = {
      fileName: '/projects/helloworld.java',
      languageId: 'java',
    } as any;

    const remoteAvailablePlugins: LanguagePlugins[] = [
      {
        category: 'Programming Languages',
        ids: ['plugin/java/latest'],
      },
      {
        category: 'Other',
        ids: ['plugin/java2/latest'],
      },
      {
        category: 'Programming Languages',
        ids: ['plugin/java/latest'],
      },
    ];
    fetchMethodMock.mockResolvedValue(remoteAvailablePlugins);

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      featuredList: [],
    };

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    expect(showInformationMessageMock).toBeCalled();
    expect(showInformationMessageMock.mock.calls[0][0]).toContain(
      "The plug-in registry has plug-ins that can help with 'java' files: plugin/java/latest"
    );

    // now retry to open the same file, we should not get recommendation as it has been already suggested
    showInformationMessageMock.mockReset();
    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    expect(showInformationMessageMock).toBeCalledTimes(0);
  });

  test('suggest go but disable any recommandations after that', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);

    const devfileHasPlugins = true;
    const workspaceFolder = { uri: { path: '/projects' } } as any;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    theia.workspace.workspaceFolders = workspaceFolders;
    const document = {
      fileName: '/projects/helloworld.go',
      languageId: 'go',
    } as any;

    const remoteAvailablePlugins: LanguagePlugins[] = [
      {
        category: 'Programming Languages',
        ids: ['plugin/go/latest'],
      },
    ];
    fetchMethodMock.mockResolvedValue(remoteAvailablePlugins);

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      featuredList: [],
    };

    // click on don't show again
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    showInformationMessageMock.mockReset();
    showInformationMessageMock.mockResolvedValue({ title: "Don't Show Again Recommendations" });

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    expect(showInformationMessageMock).toBeCalled();
    expect(showInformationMessageMock.mock.calls[0][0]).toContain(
      "The plug-in registry has plug-ins that can help with 'go' files: plugin/go/latest"
    );

    // check that we've called the disable
    expect(devfileHandlerDisableRecommendationsMock).toBeCalled();
  });

  test('suggest go and validate install', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);

    const devfileHasPlugins = true;
    const workspaceFolder = { uri: { path: '/projects' } } as any;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    theia.workspace.workspaceFolders = workspaceFolders;
    const document = {
      fileName: '/projects/helloworld.go',
      languageId: 'go',
    } as any;

    const remoteAvailablePlugins: LanguagePlugins[] = [
      {
        category: 'Programming Languages',
        ids: ['plugin/go/latest'],
      },
    ];
    fetchMethodMock.mockResolvedValue(remoteAvailablePlugins);

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      featuredList: [],
    };

    // click on install
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    showInformationMessageMock.mockReset();
    showInformationMessageMock.mockResolvedValue({ title: 'Install...' });

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    expect(showInformationMessageMock).toBeCalled();
    expect(showInformationMessageMock.mock.calls[0][0]).toContain(
      "The plug-in registry has plug-ins that can help with 'go' files: plugin/go/latest"
    );

    // check that we've called the install
    expect(devfileHandlerAddPluginsMock).toHaveBeenCalledWith(['plugin/go/latest']);

    // check that we've called the restart
    expect(workspaceHandlerRestartMock).toHaveBeenCalledWith(
      'Plug-ins plugin/go/latest have been added to your workspace. Please restart the workspace to see the changes.'
    );

    // but not the disable recommendations
    expect(devfileHandlerDisableRecommendationsMock).toBeCalledTimes(0);
  });

  test('do not suggest when there are already plugins for the current language ID', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);
    languagesByFileExtensions.set('.java', ['java']);
    vscodeExtensionByLanguageId.set('java', ['redhat/java']);

    const devfileHasPlugins = true;
    const workspaceFolder = { uri: { path: '/projects' } } as any;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    theia.workspace.workspaceFolders = workspaceFolders;
    const document = {
      fileName: '/projects/helloworld.java',
      languageId: 'java',
    } as any;

    const remoteAvailablePlugins: LanguagePlugins[] = [];
    fetchMethodMock.mockResolvedValue(remoteAvailablePlugins);

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      featuredList: [],
    };

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    expect(showInformationMessageMock).toBeCalledTimes(0);
  });

  test('do not suggest when there is no remote plug-ins for the current language ID', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);
    languagesByFileExtensions.set('.java', ['java']);

    const devfileHasPlugins = true;
    const workspaceFolder = { uri: { path: '/projects' } } as any;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    theia.workspace.workspaceFolders = workspaceFolders;
    const document = {
      fileName: '/projects/helloworld.java',
      languageId: 'java',
    } as any;

    const remoteAvailablePlugins: LanguagePlugins[] = [];
    fetchMethodMock.mockResolvedValue(remoteAvailablePlugins);

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins,
      featuredList: [],
    };

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    const showInformationMessageMock = theia.window.showInformationMessage as jest.Mock;
    expect(showInformationMessageMock).toBeCalledTimes(0);
  });

  test('No suggestion when document is not part of workspace', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);
    const workspaceFolder = { uri: { path: '/projects' } } as any;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    theia.workspace.workspaceFolders = workspaceFolders;
    const document = {
      fileName: '/external/external.java',
      languageId: 'java',
    } as any;

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins: false,
      featuredList: [],
    };

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    // we do not call fetch
    expect(fetchMethodMock).toBeCalledTimes(0);
  });

  test('No suggestion when no workspace folders', async () => {
    const recommendPluginOpenFileStrategy = container.get(RecommendPluginOpenFileStrategy);
    theia.workspace.workspaceFolders = undefined;
    const document = {
      fileName: '/external/external.java',
      languageId: 'java',
    } as any;

    const recommendationsPluginAnalysis: RecommendationsPluginAnalysis = {
      vsCodeExtensionsInstalledLanguages,
      devfileHasPlugins: false,
      featuredList: [],
    };

    await recommendPluginOpenFileStrategy.onOpenFile(document, recommendationsPluginAnalysis);
    // we do not call fetch
    expect(fetchMethodMock).toBeCalledTimes(0);
  });
});
