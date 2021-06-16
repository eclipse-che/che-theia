/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as git from '../src/git';
import * as theia from '@theia/plugin';
import * as theiaCommands from '../src/theia-commands';

import { DevfileServiceImpl } from '../src/devfile-service';
import { WorkspaceFolderUpdaterImpl } from '../src/workspace-folder-updater';
import { WorkspaceProjectsManager } from '../src/workspace-projects-manager';

jest.mock('../src/workspace-folder-updater');
jest.mock('../src/devfile-service');
jest.mock('fs-extra');
jest.mock('../src/git');

const PROJECTS_ROOT = '/projects';

const firstProject: che.devfile.DevfileProject = {
  name: 'che-theia',
};

const secondProject: che.devfile.DevfileProject = {
  name: 'theia',
};

let pathExistsItems: string[] = [];

async function pathExistsMockImpl(path: string): Promise<boolean> {
  return pathExistsItems.some(item => path === item);
}

interface WatchListener {
  path: string;
  listener: (event: string, filename: string) => Promise<void>;
}

let watchListeners: WatchListener[] = [];

function watchMockImpl(
  path: string,
  options: {} | undefined,
  listener: (event: string, filename: string) => Promise<void>
) {
  watchListeners.push({
    path,
    listener,
  });
}

async function fireFileSystemChangedEvent(path: string, event: string, filename: string): Promise<void> {
  for (const watchListener of watchListeners) {
    if (watchListener.path === path) {
      await watchListener.listener(event, filename);
    }
  }
}

let lstatItems: string[] = [];

async function lstatMockImpl(path: string): Promise<fs.Stats> {
  return {
    isDirectory: () => lstatItems.some(p => p === path),
  } as fs.Stats;
}

const pathExistsMock = jest.fn();
pathExistsMock.mockImplementation(pathExistsMockImpl);

const watchMock = jest.fn();
watchMock.mockImplementation(watchMockImpl);

const lstatMock = jest.fn();
lstatMock.mockImplementation(lstatMockImpl);

Object.assign(fs, {
  pathExists: pathExistsMock,
  watch: watchMock,
  lstat: lstatMock,
});

const getUpstreamGitBranchSpy = jest.spyOn(git, 'getUpstreamBranch');

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
};

const appendLineMock = jest.fn();

const outputChannelMock = {
  appendLine: appendLineMock,
  show: jest.fn(),
};

const getDevfileMock = jest.fn();
che.devfile.get = getDevfileMock;

const updateDevfileMock = jest.fn();
che.devfile.update = updateDevfileMock;

const devfile_Without_Attributes = {
  metadata: {},
  projects: [firstProject],
};

const devfile_With_Two_Projects = {
  metadata: {},
  projects: [firstProject, secondProject],
};

const devfileWith_MultiRoot_On_Attribute = {
  metadata: {
    attributes: {
      multiRoot: 'on',
    },
  },
  projects: [firstProject],
};

const devfileWith_MultiRoot_Off_Attribute = {
  metadata: {
    attributes: {
      multiRoot: 'off',
    },
  },
  projects: [firstProject],
};

const fileSystemWatcherMock = {
  onDidCreate: jest.fn(),
  onDidChange: jest.fn(),
  onDidDelete: jest.fn(),
  dispose: jest.fn(),
};
const createFileSystemWatcherMock = jest.fn();
createFileSystemWatcherMock.mockReturnValue(fileSystemWatcherMock);
(theia.window.createOutputChannel as jest.Mock).mockReturnValue(outputChannelMock);
const showInfoMessageMock = theia.window.showInformationMessage as jest.Mock;

const workspace = { createFileSystemWatcher: createFileSystemWatcherMock };
Object.assign(theia, { workspace });

const buildProjectImportCommandMock = jest.fn();
Object.assign(theiaCommands, { buildProjectImportCommand: buildProjectImportCommandMock });

const theiaImportCommand: theiaCommands.TheiaImportCommand = new theiaCommands.TheiaGitCloneCommand(
  firstProject,
  PROJECTS_ROOT
);
const executeImportCommandMock = jest.fn();
theiaImportCommand.execute = executeImportCommandMock;

describe('Test Workspace Projects Manager', () => {
  const workspaceProjectsManager: WorkspaceProjectsManager = new WorkspaceProjectsManager(context, PROJECTS_ROOT);

  const workspaceFolderUpdaterInstance = (WorkspaceFolderUpdaterImpl as jest.Mock).mock.instances[0];
  const addWorkspaceFolderMock: jest.Mock = workspaceFolderUpdaterInstance.addWorkspaceFolder;
  const removeWorkspaceFolderMock: jest.Mock = workspaceFolderUpdaterInstance.removeWorkspaceFolder;

  const devfileServiceInstance = (DevfileServiceImpl as jest.Mock).mock.instances[0];
  const updateProjectMock: jest.Mock = devfileServiceInstance.updateProject;
  const deleteProjectMock: jest.Mock = devfileServiceInstance.deleteProject;

  const onProjectChangedSpy: jest.SpyInstance = jest.spyOn(workspaceProjectsManager, 'onProjectChanged');
  const onProjectRemovedSpy: jest.SpyInstance = jest.spyOn(workspaceProjectsManager, 'onProjectRemoved');

  beforeEach(() => {
    showInfoMessageMock.mockClear();

    addWorkspaceFolderMock.mockClear();
    removeWorkspaceFolderMock.mockClear();

    updateProjectMock.mockReset();
    deleteProjectMock.mockReset();

    onProjectChangedSpy.mockClear();
    onProjectRemovedSpy.mockClear();

    getDevfileMock.mockClear();
    updateDevfileMock.mockClear();

    getUpstreamGitBranchSpy.mockReset();

    buildProjectImportCommandMock.mockReturnValue(theiaImportCommand);

    pathExistsItems = [];
    pathExistsMock.mockClear();

    watchListeners = [];
    watchMock.mockClear();

    lstatItems = [];
    lstatMock.mockClear();

    executeImportCommandMock.mockClear();
    executeImportCommandMock.mockResolvedValue('');

    appendLineMock.mockReset();
  });

  test('Should read the devfie when running', async () => {
    getDevfileMock.mockReturnValue({});

    new WorkspaceProjectsManager(context, PROJECTS_ROOT).run();

    expect(getDevfileMock).toBeCalledTimes(1);
  });

  test('Should add workspace folder when there are no attributes - multi root mode is ON by default', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(1);
  });

  test('Should add workspace folder when there is the `multiRoot` attribute with `on` value', async () => {
    getDevfileMock.mockReturnValue(devfileWith_MultiRoot_On_Attribute);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(1);
  });

  test('Should NOT add workspace folder when there is the `multiRoot` attribute with `off` value', async () => {
    getDevfileMock.mockReturnValue(devfileWith_MultiRoot_Off_Attribute);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(0);
    expect(showInfoMessageMock).toBeCalledTimes(2);
  });

  test('Should clone the second project and add it as workspace folder when cloning of the first project was failed', async () => {
    const failedImportCommand: theiaCommands.TheiaImportCommand = new theiaCommands.TheiaGitCloneCommand(
      secondProject,
      PROJECTS_ROOT
    );

    const executeFailedImportCommandMock = jest.fn();
    executeFailedImportCommandMock.mockImplementation(() => {
      throw new Error('some error happened at clone process execution');
    });
    failedImportCommand.execute = executeFailedImportCommandMock;

    getDevfileMock.mockReturnValue(devfile_With_Two_Projects);
    buildProjectImportCommandMock.mockReturnValueOnce(failedImportCommand);
    buildProjectImportCommandMock.mockReturnValueOnce(theiaImportCommand);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(1); // there 2 projects for cloning, but only one was cloned successfully
    expect(executeImportCommandMock).toBeCalledTimes(1);
    expect(executeFailedImportCommandMock).toBeCalledTimes(1);
    expect(showInfoMessageMock).toBeCalledTimes(2);
  });

  test('Should check steps of successful cloning process execution', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(1);
    expect(executeImportCommandMock).toBeCalledTimes(1);
    expect(showInfoMessageMock).toBeCalledTimes(2);
  });

  test('Should clone two projects and add them as workspace folders', async () => {
    const secondImportCommand: theiaCommands.TheiaImportCommand = new theiaCommands.TheiaGitCloneCommand(
      secondProject,
      PROJECTS_ROOT
    );

    const executeSecondImportCommandMock = jest.fn();
    executeSecondImportCommandMock.mockResolvedValue('');
    secondImportCommand.execute = executeSecondImportCommandMock;

    getDevfileMock.mockReturnValue(devfile_With_Two_Projects);
    buildProjectImportCommandMock.mockReturnValueOnce(secondImportCommand);
    buildProjectImportCommandMock.mockReturnValueOnce(theiaImportCommand);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(2);
    expect(executeImportCommandMock).toBeCalledTimes(1);
    expect(executeSecondImportCommandMock).toBeCalledTimes(1);
    expect(showInfoMessageMock).toBeCalledTimes(2);
  });

  test('Commands were NOT found for execution cloning process', async () => {
    buildProjectImportCommandMock.mockReturnValue(undefined);
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(0);
    expect(executeImportCommandMock).toBeCalledTimes(0);
    expect(showInfoMessageMock).toBeCalledTimes(0);
  });

  // Backward compatibility for single-root workspaces
  // we need it to support workspaces which were created before switching multi-root mode to ON by default
  test('Should add projects as workspace folders when projects already exist on file system', async () => {
    getDevfileMock.mockReturnValue(devfile_With_Two_Projects);

    pathExistsItems = ['/projects/che-theia', '/projects/theia'];

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(2);

    expect(addWorkspaceFolderMock).toBeCalledWith('/projects/che-theia');
    expect(addWorkspaceFolderMock).toBeCalledWith('/projects/theia');
  });

  test('Should not add projects as workspace folders: cloning failed and projects do not exist on file system', async () => {
    getDevfileMock.mockReturnValue(devfile_With_Two_Projects);

    executeImportCommandMock.mockReset();

    await workspaceProjectsManager.run();

    expect(addWorkspaceFolderMock).toBeCalledTimes(0);
  });

  /**
   * Test
   * - run workspace project manager in mutiroot mode with one project
   * - fire change event for /projects/test-project-to-add
   *
   * Expect:
   * - onProjectChanged must be called
   * - onProjectRemoved must NOT be called
   */
  test('onProjectChanged must be called on change event', async () => {
    getDevfileMock.mockReturnValue(devfileWith_MultiRoot_On_Attribute);

    pathExistsItems = [PROJECTS_ROOT];
    await workspaceProjectsManager.run();

    // clear mocks
    addWorkspaceFolderMock.mockClear();
    removeWorkspaceFolderMock.mockClear();

    pathExistsItems = [PROJECTS_ROOT + '/test-project-to-add'];
    lstatItems = [PROJECTS_ROOT + '/test-project-to-add'];

    getUpstreamGitBranchSpy.mockResolvedValue({
      remote: '',
      branch: 'main',
      remoteURL: 'remote url',
    });

    await fireFileSystemChangedEvent(PROJECTS_ROOT, 'create', 'test-project-to-add');

    expect(addWorkspaceFolderMock).toBeCalledTimes(1);
    expect(removeWorkspaceFolderMock).toBeCalledTimes(0);

    expect(onProjectChangedSpy).toBeCalledTimes(1);
    expect(onProjectRemovedSpy).toBeCalledTimes(0);

    expect(updateProjectMock).toBeCalledTimes(1);
    expect(deleteProjectMock).toBeCalledTimes(0);
  });

  /**
   * Test
   * - run workspace project manager in mutiroot mode with one project
   * - fire change event for /projects/test-project-to-add
   * - do NOT provide branch for the project
   *
   * Expect:
   * - project must be added as workspace folder
   * - project is not a Git repository, do not add it to the devfile
   *     ( devfileService.updateProject must NOT be called )
   */
  test('devfileService.updateProject must NOT be called for not Git repository', async () => {
    getDevfileMock.mockReturnValue(devfileWith_MultiRoot_On_Attribute);

    pathExistsItems = [PROJECTS_ROOT];
    await workspaceProjectsManager.run();

    // clear mocks
    addWorkspaceFolderMock.mockClear();
    removeWorkspaceFolderMock.mockClear();

    pathExistsItems = lstatItems = [PROJECTS_ROOT + '/test-project-to-add'];

    await fireFileSystemChangedEvent(PROJECTS_ROOT, 'create', 'test-project-to-add');

    expect(addWorkspaceFolderMock).toBeCalledTimes(1);
    expect(removeWorkspaceFolderMock).toBeCalledTimes(0);

    expect(onProjectChangedSpy).toBeCalledTimes(1);
    expect(onProjectRemovedSpy).toBeCalledTimes(0);

    expect(updateProjectMock).toBeCalledTimes(0);
    expect(deleteProjectMock).toBeCalledTimes(0);
  });

  /**
   * Test
   * - run workspace project manager in mutiroot mode with one project
   * - fire change event for /projects/test-project-to-add
   *     (fs.pathExists('/projects/test-project-to-add') must return false)
   *
   * Expect:
   * - onProjectChanged must be NOT called
   * - onProjectRemoved must be called
   */
  test('onProjectRemoved must be called on change event for non existent item', async () => {
    getDevfileMock.mockReturnValue(devfileWith_MultiRoot_On_Attribute);

    pathExistsItems = [PROJECTS_ROOT];
    await workspaceProjectsManager.run();

    // clear mocks
    addWorkspaceFolderMock.mockClear();
    removeWorkspaceFolderMock.mockClear();

    pathExistsItems = lstatItems = [];
    await fireFileSystemChangedEvent(PROJECTS_ROOT, 'create', 'test-project-to-add');

    expect(addWorkspaceFolderMock).toBeCalledTimes(0);
    expect(removeWorkspaceFolderMock).toBeCalledTimes(1);

    expect(onProjectChangedSpy).toBeCalledTimes(0);
    expect(onProjectRemovedSpy).toBeCalledTimes(1);

    expect(updateProjectMock).toBeCalledTimes(0);
    expect(deleteProjectMock).toBeCalledTimes(1);
  });

  test('test rejecting in workspaceProjectsManager.onProjectChanged for non-git project', async () => {
    const project = PROJECTS_ROOT + '/test-project';
    await workspaceProjectsManager.onProjectChanged(project);

    expect(updateProjectMock).toBeCalledTimes(0);

    expect(appendLineMock).toBeCalledTimes(1);
    expect(appendLineMock).toBeCalledWith(`Could not detect git project branch for ${project}`);
  });

  test('test rejecting in workspaceProjectsManager.onProjectChanged', async () => {
    getUpstreamGitBranchSpy.mockResolvedValue({
      remote: '',
      branch: 'main',
      remoteURL: 'remote url',
    });

    updateProjectMock.mockRejectedValue(new Error('failure to update project'));

    await workspaceProjectsManager.onProjectChanged(PROJECTS_ROOT + '/test-project');

    expect(updateProjectMock).toBeCalledTimes(1);

    expect(appendLineMock).toBeCalledTimes(1);
    expect(appendLineMock).toBeCalledWith('failure to update project');
  });

  test('test rejecting in workspaceProjectsManager.onProjectRemoved', async () => {
    getUpstreamGitBranchSpy.mockResolvedValue({
      remote: '',
      branch: 'main',
      remoteURL: 'remote url',
    });

    deleteProjectMock.mockRejectedValue(new Error('failure to delete project'));

    await workspaceProjectsManager.onProjectRemoved(PROJECTS_ROOT + '/test-project');

    expect(deleteProjectMock).toBeCalledTimes(1);

    expect(appendLineMock).toBeCalledTimes(1);
    expect(appendLineMock).toBeCalledWith('failure to delete project');
  });
});
