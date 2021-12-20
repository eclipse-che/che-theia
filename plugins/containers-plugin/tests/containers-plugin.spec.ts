/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
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
import * as containersPlugin from '../src/containers-plugin';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as theia from '@theia/plugin';

describe('Test containers plugin', () => {
  const createTreeViewSpy = jest.spyOn(theia.window, 'createTreeView');
  const getCurrentWorkspaceSpy = jest.spyOn(che.workspace, 'getCurrentWorkspace');
  const devfileGetSpy = jest.spyOn(che.devfile, 'get');
  const devfileGetComponentStatusesSpy = jest.spyOn(che.devfile, 'getComponentStatuses');

  const uri: theia.Uri = {
    authority: '',
    fragment: '',
    fsPath: '',
    path: '',
    query: '',
    scheme: '',
    toJSON: jest.fn(),
    toString: jest.fn(),
    with: jest.fn(),
  };
  const context: theia.PluginContext = {
    environmentVariableCollection: {
      persistent: false,
      append: jest.fn(),
      clear: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn(),
      get: jest.fn(),
      prepend: jest.fn(),
      replace: jest.fn(),
    },
    secrets: {
      get: jest.fn(),
      delete: jest.fn(),
      store: jest.fn(),
      onDidChange: jest.fn(),
    },
    extensionPath: '',
    extensionUri: uri,
    storageUri: uri,
    globalStorageUri: uri,
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
      setKeysForSync: jest.fn(),
    },
    globalStoragePath: '',
    logPath: '',
    storagePath: '',
    subscriptions: [],
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
    },
    asAbsolutePath: jest.fn(),
    extensionMode: 3,
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const treeView: theia.TreeView<any> = {
    onDidChangeSelection: jest.fn(),
    onDidChangeVisibility: jest.fn(),
    onDidCollapseElement: jest.fn(),
    onDidExpandElement: jest.fn(),
    reveal: jest.fn(),
    selection: [],
    visible: false,
    dispose: jest.fn,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  test('start', async () => {
    createTreeViewSpy.mockReturnValue(treeView);
    getCurrentWorkspaceSpy.mockResolvedValue({ devfile: { metadata: { name: 'workspace-name' } } });
    const devfileGetRawJson = await fs.readFile(path.join(__dirname, '_data', 'devfile-get.json'), 'utf8');
    const devfileGetComponentStatusesRawJson = await fs.readFile(
      path.join(__dirname, '_data', 'devfile-component-statuses.json'),
      'utf8'
    );
    devfileGetSpy.mockReturnValue(JSON.parse(devfileGetRawJson));
    devfileGetComponentStatusesSpy.mockReturnValue(JSON.parse(devfileGetComponentStatusesRawJson));

    await containersPlugin.start(context);

    expect(createTreeViewSpy).toBeCalled();
    expect(getCurrentWorkspaceSpy).toBeCalled();
    expect(treeView.title).toBe('workspace-name');
  });
});
