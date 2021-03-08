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

import * as che from '@eclipse-che/plugin';
import * as git from '../src/git';
import * as theia from '@theia/plugin';

import { TheiaGitCloneCommand, TheiaImportZipCommand, buildProjectImportCommand } from '../src/theia-commands';

jest.mock('../src/git', () => ({
  isSecureGitURI: jest.fn(),
  execGit: jest.fn(),
}));

describe('Test theia-commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });
  test('buildProjectImportCommand git', async () => {
    const project: che.devfile.DevfileProject = {
      name: 'che-theia',
      git: {
        remotes: {
          origin: 'https://github.com/eclipse/che-theia.git',
        },
        checkoutFrom: {
          revision: 'che-13112',
        },
      },
    };
    const command = buildProjectImportCommand(project, '/foo');
    expect(command).toBeDefined();
    // should be a git clone command
    expect(command instanceof TheiaGitCloneCommand).toBeTruthy();
  });

  test('buildProjectImportCommand github', async () => {
    const project: che.devfile.DevfileProject = {
      name: 'che-theia',
      github: {
        remotes: {
          origin: 'https://github.com/eclipse/che-theia.git',
        },
        checkoutFrom: {
          revision: 'che-13112',
        },
      },
    };
    const command = buildProjectImportCommand(project, '/foo');
    expect(command).toBeDefined();
    // should be a git clone command
    expect(command instanceof TheiaGitCloneCommand).toBeTruthy();
  });

  test('buildProjectImportCommand zip', async () => {
    const project: che.devfile.DevfileProject = {
      name: 'che-theia',
      zip: {
        location: 'http://foo/bar.zip',
      },
    };
    const command = buildProjectImportCommand(project, '/foo');
    expect(command).toBeDefined();
    // should be a zip command
    expect(command instanceof TheiaImportZipCommand).toBeTruthy();
  });

  test('buildProjectImportCommand missing type', async () => {
    theia.window.showWarningMessage = jest.fn();
    const warningSpy = jest.spyOn(theia.window, 'showWarningMessage');
    const projects: che.devfile.DevfileProject = {
      name: 'che-theia',
    };
    const command = buildProjectImportCommand(projects, '/foo');
    expect(command).toBeUndefined();
    expect(warningSpy).toBeCalled();
  });

  test('clone git', async () => {
    (theia as any).ProgressLocation = {
      Notification: '',
    };
    const progressFunction = jest.fn();
    theia.window.withProgress = progressFunction;
    theia.window.showErrorMessage = jest.fn();
    theia.window.showInformationMessage = jest.fn();

    const project: che.devfile.DevfileProject = {
      name: 'che-theia',
      git: {
        remotes: {
          origin: 'https://github.com/eclipse/che-theia.git',
        },
        checkoutFrom: {
          revision: 'che-13112',
        },
      },
    };
    const cloneCommand = new TheiaGitCloneCommand(project, '/foo');
    await cloneCommand.execute();
    expect(progressFunction).toBeCalled();
    const execGitSpy = jest.spyOn(git, 'execGit');

    execGitSpy.mockResolvedValueOnce('foo1');
    execGitSpy.mockResolvedValueOnce('foo2');
    execGitSpy.mockResolvedValueOnce('foo3');
    execGitSpy.mockResolvedValueOnce('foo4');
    // call callback
    await progressFunction.mock.calls[0][1].call(cloneCommand);

    expect(execGitSpy).toBeCalledTimes(2);
    const infoMessage = (theia.window.showInformationMessage as jest.Mock).mock.calls[0];
    expect(infoMessage[0]).toContain(
      'Project https://github.com/eclipse/che-theia.git cloned to /foo/che-theia using default branch which has been reset to che-13112.'
    );
  });
});
