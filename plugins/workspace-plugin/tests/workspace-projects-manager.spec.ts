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
import * as git from '../src/git';
import * as projectsHelper from '../src/projects';
import * as theia from '@theia/plugin';
import * as theiaCommands from '../src/theia-commands';

import { WorkspaceFolderUpdater } from '../src/workspace-folder-updater';
import { WorkspaceProjectsManager } from '../src/workspace-projects-manager';

jest.mock('../src/workspace-folder-updater');
jest.mock('../src/projects');

const PROJECTS_ROOT = '/projects';
const firstProject: che.devfile.DevfileProject = {
  name: 'che-theia',
};
const secondProject: che.devfile.DevfileProject = {
  name: 'theia',
};

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

const outputChannelMock = {
  appendLine: jest.fn(),
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

const updateOrCreateGitProjectInDevfileMock = projectsHelper.updateOrCreateGitProjectInDevfile as jest.Mock;
const deleteProjectFromDevfileMock = projectsHelper.deleteProjectFromDevfile as jest.Mock;

describe('Test Workspace Projects Manager', () => {
  const workspaceProjectsManager: WorkspaceProjectsManager = new WorkspaceProjectsManager(context, PROJECTS_ROOT);

  const workspaceFolderUpdaterInstance = (WorkspaceFolderUpdater as jest.Mock).mock.instances[0];
  const addWorkspaceFolderMock = workspaceFolderUpdaterInstance.addWorkspaceFolder;

  beforeEach(() => {
    executeImportCommandMock.mockClear();
    showInfoMessageMock.mockClear();
    addWorkspaceFolderMock.mockClear();
    getDevfileMock.mockClear();
    updateDevfileMock.mockClear();
    updateOrCreateGitProjectInDevfileMock.mockClear();
    deleteProjectFromDevfileMock.mockClear();

    buildProjectImportCommandMock.mockReturnValue(theiaImportCommand);
    executeImportCommandMock.mockResolvedValue('');
  });

  test('Should create an instanse of the WorkspaceProjectsManager and run it', async () => {
    // handleWorkspaceProjects(context, PROJECTS_ROOT);
    new WorkspaceProjectsManager(context, PROJECTS_ROOT).run();

    expect(getDevfileMock).toBeCalledTimes(1); // workspaceProjectsManager.run() is called
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

  test('Should create a git project in a Devfile', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    const getUpstreamBranchSpy = jest.spyOn(git, 'getUpstreamBranch');
    getUpstreamBranchSpy.mockResolvedValueOnce({
      branch: 'branch',
      remote: 'remote',
      remoteURL: 'someRemoteUrl',
    });

    await workspaceProjectsManager.updateOrCreateProjectInWorkspace('/projects/che-theia');

    expect(updateOrCreateGitProjectInDevfileMock).toBeCalledTimes(1);
  });

  test('Should NOT create a project when given Uri is not defined', async () => {
    await workspaceProjectsManager.updateOrCreateProjectInWorkspace('');

    expect(getDevfileMock).toBeCalledTimes(0);
    expect(updateDevfileMock).toBeCalledTimes(0);
    expect(updateOrCreateGitProjectInDevfileMock).toBeCalledTimes(0);
  });

  test('Should NOT create a git project in a Devfile when `remoteURL` is not defined', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    const getUpstreamBranchSpy = jest.spyOn(git, 'getUpstreamBranch');
    getUpstreamBranchSpy.mockResolvedValueOnce({
      branch: 'branch',
      remote: 'remote',
      remoteURL: '', // not defined
    });

    await workspaceProjectsManager.updateOrCreateProjectInWorkspace('/projects/che-theia');

    expect(updateOrCreateGitProjectInDevfileMock).toBeCalledTimes(0);
  });

  test('Should NOT create a git project in a Devfile when upstream branch is `undefined`', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    const getUpstreamBranchSpy = jest.spyOn(git, 'getUpstreamBranch');
    getUpstreamBranchSpy.mockResolvedValueOnce(undefined);

    await workspaceProjectsManager.updateOrCreateProjectInWorkspace('/projects/che-theia');

    expect(updateOrCreateGitProjectInDevfileMock).toBeCalledTimes(0);
  });

  test('Should delete a project from Devfile', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    await workspaceProjectsManager.deleteProjectFromWorkspace('/projects/che-theia');

    expect(getDevfileMock).toBeCalledTimes(1);
    expect(updateDevfileMock).toBeCalledTimes(1);
    expect(deleteProjectFromDevfileMock).toBeCalledTimes(1);
  });

  test('Should NOT delete a project when given Uri is not defined', async () => {
    await workspaceProjectsManager.deleteProjectFromWorkspace('');

    expect(getDevfileMock).toBeCalledTimes(0);
    expect(updateDevfileMock).toBeCalledTimes(0);
    expect(deleteProjectFromDevfileMock).toBeCalledTimes(0);
  });
});
