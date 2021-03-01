/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { WorkspaceFolderUpdater } from '../src/workspace-folder-updater';

interface WorkspaceFolder {
  readonly uri: theia.Uri;
}

const PROJECT_1_PATH = '/projects/theia';
const PROJECT_2_PATH = '/projects/che-theia';
const PROJECT_3_PATH = '/projects/test-plugin';
const WRONG_PROJECT_PATH = '/projects/theia/';
const CORRECT_FOLDER_PATH = '/projects/theia';

let actualWorkspaceFolders: string[] = [];
let addedFoldersForEvent: WorkspaceFolder[] = [];

const onDidChangeWorkspaceFolders = jest.fn();
onDidChangeWorkspaceFolders.mockImplementation(onDidChangeWorkspaceFoldersTestImpl);

const workspace = { onDidChangeWorkspaceFolders };
Object.assign(theia, { workspace });

Object.assign(theia, { Uri: {} });
const fileFunc = jest.fn();
theia.Uri.file = fileFunc;
fileFunc.mockImplementation(uriStub);

const updateWorkspaceFolders = jest.fn();

const dispose = jest.fn();
const disposable = { dispose };

theia.workspace.updateWorkspaceFolders = updateWorkspaceFolders;

describe('Test Workspace Folder Updater', () => {
  const workspaceFolderUpdater: WorkspaceFolderUpdater = new WorkspaceFolderUpdater(200);

  beforeEach(() => {
    actualWorkspaceFolders = [];
    addedFoldersForEvent = [];
    updateWorkspaceFolders.mockReset();
    updateWorkspaceFolders.mockRestore();
    dispose.mockReset();

    updateWorkspaceFolders.mockImplementation(updateWorkspaceFoldersTestImpl);
    theia.workspace.workspaceFolders = [];
  });

  test('request update Workspace Folders using API', async () => {
    const workspaceFolder = { uri: uriStub(PROJECT_1_PATH) };
    addedFoldersForEvent = [workspaceFolder];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1_PATH]);
    expect(updateWorkspaceFolders).toBeCalledTimes(1);
    expect(dispose).toBeCalledTimes(1);
  });

  test('it shoud skip a request if there is pending request for the same folder', async () => {
    const workspaceFolder_1 = { uri: uriStub(PROJECT_1_PATH) };
    const workspaceFolder_2 = { uri: uriStub(PROJECT_2_PATH) };
    addedFoldersForEvent = [workspaceFolder_1, workspaceFolder_2];

    workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);
    workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2_PATH);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2_PATH);
    await waitUpdateFolders(500);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1_PATH, PROJECT_2_PATH]);
    expect(updateWorkspaceFolders).toBeCalledTimes(2);
    expect(dispose).toBeCalledTimes(2);
  });

  test('it shoud skip adding Workspace Folders duplicates', async () => {
    const workspaceFolder = { uri: uriStub(PROJECT_1_PATH) };
    addedFoldersForEvent = [workspaceFolder];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);

    theia.workspace.workspaceFolders = [{ name: '', index: 0, uri: workspaceFolder.uri }];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);
    await waitUpdateFolders(150);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1_PATH]);
    expect(updateWorkspaceFolders).toBeCalledTimes(1);
    expect(dispose).toBeCalledTimes(1);
  });

  test('it shoud reject adding a Workspace Folder by timeout', async () => {
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);

    expect(actualWorkspaceFolders).toStrictEqual([]);
    expect(updateWorkspaceFolders).toBeCalledTimes(1);
    expect(dispose).toBeCalledTimes(1);
  });

  test('it shoud add the next folder after rejecting adding a Workspace Folder by timeout', async () => {
    // add PROJECT_1_PATH
    // add PROJECT_2_PATH
    // case: there is no an event that PROJECT_1_PATH was added ==> the first request should be rejected by timeout
    // then the second request should be handled
    // The expected behavior = PROJECT_2_PATH is added as a workspace folder

    const workspaceFolder = { uri: uriStub(PROJECT_2_PATH) };
    addedFoldersForEvent = [workspaceFolder];

    workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2_PATH);
    await waitUpdateFolders(500);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_2_PATH]);
    expect(updateWorkspaceFolders).toBeCalledTimes(2);
    expect(dispose).toBeCalledTimes(2);
  });

  test('it shoud add Workspace Folders in turn', async () => {
    const workspaceFolder_1 = { uri: uriStub(PROJECT_1_PATH) };
    const workspaceFolder_2 = { uri: uriStub(PROJECT_2_PATH) };
    const workspaceFolder_3 = { uri: uriStub(PROJECT_3_PATH) };
    addedFoldersForEvent = [workspaceFolder_1, workspaceFolder_2, workspaceFolder_3];

    workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1_PATH);
    workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2_PATH);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_3_PATH);
    await waitUpdateFolders(500);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1_PATH, PROJECT_2_PATH, PROJECT_3_PATH]);
    expect(updateWorkspaceFolders).toBeCalledTimes(3);
    expect(dispose).toBeCalledTimes(3);
  });

  test('it should correct a project path to the valid Workspace Folder path ', async () => {
    const workspaceFolder = { uri: uriStub(CORRECT_FOLDER_PATH) };
    addedFoldersForEvent = [workspaceFolder];

    await workspaceFolderUpdater.addWorkspaceFolder(WRONG_PROJECT_PATH);

    expect(actualWorkspaceFolders).toStrictEqual([CORRECT_FOLDER_PATH]);
  });
});

function updateWorkspaceFoldersTestImpl(
  start: number,
  deleteCount: number | undefined | null,
  workspaceFolderToAdd: { uri: theia.Uri; name?: string }
): boolean {
  const projectPath = workspaceFolderToAdd.uri.path;
  if (projectPath && addedFoldersForEvent.some(folder => folder.uri.path === projectPath)) {
    actualWorkspaceFolders.push(projectPath);
    return true;
  }
  return false;
}

function onDidChangeWorkspaceFoldersTestImpl(listener: (event: {}) => {}): { dispose(): void } {
  setTimeout(() => {
    const addWorkspaceFolderEvent = {
      added: addedFoldersForEvent,
      removed: [],
    };
    listener(addWorkspaceFolderEvent);
  }, 100);
  return disposable;
}

function uriStub(path: string): theia.Uri {
  return {
    path,
    authority: '',
    query: '',
    fsPath: '',
    scheme: '',
    fragment: '',
    with: jest.fn(),
    toJSON: jest.fn(),
  };
}

function waitUpdateFolders(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}
