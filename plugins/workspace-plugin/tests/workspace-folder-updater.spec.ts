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

import { WorkspaceFolderUpdaterImpl } from '../src/workspace-folder-updater';

const PROJECT_1 = '/projects/theia';
const PROJECT_2 = '/projects/che-theia';
const PROJECT_3 = '/projects/test-plugin';

const outputChannelMock = {
  appendLine: jest.fn(),
  show: jest.fn(),
};
(theia.window.createOutputChannel as jest.Mock).mockReturnValue(outputChannelMock);

let actualWorkspaceFolders: string[] = [];
let allowedFoldersToAdd: string[] = [];
let skipWorkspaceFolderUpdate = false;

const onDidChangeWorkspaceFolders = jest.fn();
onDidChangeWorkspaceFolders.mockImplementation(onDidChangeWorkspaceFoldersTestImpl);

const workspace = { onDidChangeWorkspaceFolders };
Object.assign(theia, { workspace });

Object.assign(theia, { Uri: {} });
const fileFunc = jest.fn();
theia.Uri.file = fileFunc;
fileFunc.mockImplementation(toUri);

const dispose = jest.fn();
const disposable = { dispose };

const updateWorkspaceFoldersMock = jest.fn();
theia.workspace.updateWorkspaceFolders = updateWorkspaceFoldersMock;

describe('Test Workspace Folder Updater', () => {
  const workspaceFolderUpdater: WorkspaceFolderUpdaterImpl = new WorkspaceFolderUpdaterImpl(100);

  beforeEach(() => {
    actualWorkspaceFolders = [];
    allowedFoldersToAdd = [];
    skipWorkspaceFolderUpdate = false;

    updateWorkspaceFoldersMock.mockReset();
    updateWorkspaceFoldersMock.mockRestore();

    dispose.mockReset();

    updateWorkspaceFoldersMock.mockImplementation(updateWorkspaceFoldersTestImpl);
    theia.workspace.workspaceFolders = undefined;
  });

  test('Add Workspace Folder should call Plugin API', async () => {
    allowedFoldersToAdd = [PROJECT_1];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1]);
    expect(updateWorkspaceFoldersMock).toBeCalledTimes(1);
    expect(dispose).toBeCalledTimes(1);
  });

  test('Adding of Workspace Folder should be rejected', async () => {
    try {
      await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);
    } catch (error) {
      expect(error.message).toEqual(`Unable to add workspace folder ${PROJECT_1}`);
      return;
    }

    fail();
  });

  test('It shoud not add the same folder twice', async () => {
    allowedFoldersToAdd = [PROJECT_1, PROJECT_2];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1, PROJECT_2]);
    expect(updateWorkspaceFoldersMock).toBeCalledTimes(2);
    expect(dispose).toBeCalledTimes(2);
  });

  test('Adding of Workspace Folder should be rejected by timeout', async () => {
    skipWorkspaceFolderUpdate = true;
    try {
      await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);
    } catch (error) {
      expect(error.message).toEqual(`Adding of workspace folder ${PROJECT_1} was canceled by timeout`);
      return;
    }

    fail();
  });

  test('Reject adding the first folder, sucessful adding of the next one', async () => {
    // add PROJECT_1_PATH
    // add PROJECT_2_PATH
    // case:
    //    adding of PROJECT_1_PATH must be failes
    //    PROJECT_2_PATH must be added to workspace folders

    allowedFoldersToAdd = [PROJECT_2];

    let addingProject1Failed = false;
    try {
      await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);
    } catch (e) {
      expect(e.message).toMatch(`Unable to add workspace folder ${PROJECT_1}`);
      addingProject1Failed = true;
    }

    expect(addingProject1Failed).toBe(true);

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_2]);
    expect(updateWorkspaceFoldersMock).toBeCalledTimes(2);
    expect(dispose).toBeCalledTimes(2);
  });

  test('Workspace Folders should be added in proper sequence', async () => {
    allowedFoldersToAdd = [PROJECT_1, PROJECT_2, PROJECT_3];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_3);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1, PROJECT_2, PROJECT_3]);
    expect(updateWorkspaceFoldersMock).toBeCalledTimes(3);
    expect(dispose).toBeCalledTimes(3);
  });

  test('Test adding the Workspace Folder with normalizing path', async () => {
    allowedFoldersToAdd = [PROJECT_1];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1 + '/');

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1]);
  });

  test('Remove Workspace Folder should call Plugin API', async () => {
    // prepate workspsce folders
    theia.workspace.workspaceFolders = [toFolder(PROJECT_1)];

    await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_1);

    expect(actualWorkspaceFolders).toStrictEqual([]);
    expect(updateWorkspaceFoldersMock).toBeCalledTimes(1);
    expect(dispose).toBeCalledTimes(1);
  });

  test('Remove Workspace Folder should be resolved immediately if no workspace folders opened', async () => {
    await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_1);

    expect(updateWorkspaceFoldersMock).toBeCalledTimes(0);
    expect(dispose).toBeCalledTimes(0);
  });

  test('Removing of Workspace Folder should be rejected by timeout', async () => {
    // prepare workspace folders
    actualWorkspaceFolders = [PROJECT_1];
    theia.workspace.workspaceFolders = [toFolder(PROJECT_1)];

    skipWorkspaceFolderUpdate = true;

    try {
      await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_1);
    } catch (error) {
      expect(error.message).toEqual(`Removing of workspace folder ${PROJECT_1} was canceled by timeout`);
      expect(actualWorkspaceFolders).toStrictEqual([PROJECT_1]);
      return;
    }

    fail();
  });

  test('Remove several Workspace Folders', async () => {
    // prepare workspace folders
    actualWorkspaceFolders = [PROJECT_1, PROJECT_2, PROJECT_3];
    theia.workspace.workspaceFolders = [toFolder(PROJECT_1), toFolder(PROJECT_2), toFolder(PROJECT_3)];

    await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_1);
    await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_3);

    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_2]);
    expect(updateWorkspaceFoldersMock).toBeCalledTimes(2);
    expect(dispose).toBeCalledTimes(2);
  });

  test('Complex adding and removing', async () => {
    allowedFoldersToAdd = [PROJECT_1, PROJECT_2, PROJECT_3];

    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_2);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_3);
    await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_1);

    // check workspace folders
    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_2, PROJECT_3]);

    await workspaceFolderUpdater.removeWorkspaceFolder(PROJECT_2);
    await workspaceFolderUpdater.addWorkspaceFolder(PROJECT_1);

    // check workspace folders
    expect(actualWorkspaceFolders).toStrictEqual([PROJECT_3, PROJECT_1]);

    expect(updateWorkspaceFoldersMock).toBeCalledTimes(6);
    expect(dispose).toBeCalledTimes(6);
  });
});

interface NotifyWorkspaceFolderChangedFunction {
  (folder: { uri: theia.Uri; name?: string }): void;
}

let notifyFolderAdded: NotifyWorkspaceFolderChangedFunction;
let notifyFolderRemoved: NotifyWorkspaceFolderChangedFunction;

function onDidChangeWorkspaceFoldersTestImpl(listener: (event: {}) => {}): { dispose(): void } {
  notifyFolderAdded = (folder: { uri: theia.Uri; name?: string }) => {
    setTimeout(() => {
      const addedEvent = {
        added: [folder],
        removed: [],
      };
      listener(addedEvent);
    }, 1);
  };

  notifyFolderRemoved = (folder: { uri: theia.Uri; name?: string }) => {
    setTimeout(() => {
      const removedEvent = {
        added: [],
        removed: [folder],
      };
      listener(removedEvent);
    }, 1);
  };

  return disposable;
}

function addWorkspaceFolder(folderToAdd: { uri: theia.Uri; name?: string }): boolean {
  const folderPath = folderToAdd.uri.path;

  if (folderPath && allowedFoldersToAdd.some(folder => folder === folderPath)) {
    if (!theia.workspace.workspaceFolders) {
      theia.workspace.workspaceFolders = [];
    }

    const folder = toFolder(folderPath);
    theia.workspace.workspaceFolders.push(folder);

    actualWorkspaceFolders.push(folderPath);

    notifyFolderAdded(folderToAdd);

    return true;
  }

  return false;
}

function removeWorkspaceFolder(start: number, deleteCount: number): boolean {
  if (theia.workspace.workspaceFolders) {
    if (theia.workspace.workspaceFolders.length > start) {
      const removed = theia.workspace.workspaceFolders[start];
      theia.workspace.workspaceFolders.splice(start, 1);

      actualWorkspaceFolders = actualWorkspaceFolders.filter(folder => folder !== removed.uri.path);

      notifyFolderRemoved(removed);

      return true;
    }
  }

  return false;
}

function updateWorkspaceFoldersTestImpl(
  start: number,
  deleteCount: number | undefined | null,
  folderToAdd: { uri: theia.Uri; name?: string } | undefined
): boolean {
  if (skipWorkspaceFolderUpdate) {
    return true;
  }

  if (folderToAdd) {
    return addWorkspaceFolder(folderToAdd);
  }

  if (deleteCount) {
    return removeWorkspaceFolder(start, deleteCount);
  }

  return false;
}

function toUri(path: string): theia.Uri {
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

function toFolder(path: string): theia.WorkspaceFolder {
  const name = path.substring(path.lastIndexOf('/') + 1);
  const uri = toUri(path);
  return {
    index: 0,
    name,
    uri,
  };
}
