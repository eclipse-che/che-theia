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
import * as theia from '@theia/plugin';

import { DevfileServiceImpl } from '../src/devfile-service';

const PROJECTS_ROOT = '/projects';

const firstProject: che.devfile.DevfileProject = {
  name: 'che-theia',
};

const devfile_Without_Attributes = {
  metadata: {},
  projects: [firstProject],
};

const getDevfileMock = jest.fn();
che.devfile.get = getDevfileMock;

const updateDevfileMock = jest.fn();
che.devfile.update = updateDevfileMock;

const outputChannelMock = {
  appendLine: jest.fn(),
  show: jest.fn(),
};
(theia.window.createOutputChannel as jest.Mock).mockReturnValue(outputChannelMock);

describe('Devfile Service:', () => {
  const devfileService = new DevfileServiceImpl(PROJECTS_ROOT);

  const deleteProjectSpy = jest.spyOn(devfileService, 'deleteGitProject');

  beforeEach(() => {
    getDevfileMock.mockClear();
    updateDevfileMock.mockClear();
    deleteProjectSpy.mockClear();
  });

  test('Should be able to create project if no projects defined', () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
    };

    devfileService.updateOrCreateGitProject(devfile, 'che', 'https://github.com/eclipse/che.git', 'che-13112');

    expect(devfile.projects!.length).toBe(1);
    expect(devfile.projects![0].name).toBe('che');
    expect(devfile.projects![0].clonePath).toBe(undefined);
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
    expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
  });

  test('Add a project into existing projects list', () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
      projects: [
        {
          name: 'che',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse/che.git',
            },
            checkoutFrom: {
              revision: 'che-13112',
            },
          },
        },
      ],
    };

    devfileService.updateOrCreateGitProject(
      devfile,
      'che-theia',
      'https://github.com/eclipse-che/che-theia.git',
      'issue-12321'
    );

    expect(devfile.projects!.length).toBe(2);
    expect(devfile.projects![0].name).toBe('che');
    expect(devfile.projects![0].clonePath).toBe(undefined);
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
    expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
    expect(devfile.projects![1].name).toBe('che-theia');
    expect(devfile.projects![1].clonePath).toBe(undefined);
    expect(devfile.projects![1].git?.remotes.origin).toBe('https://github.com/eclipse-che/che-theia.git');
    expect(devfile.projects![1].git?.checkoutFrom?.revision).toBe('issue-12321');
  });

  test('Delete existing project', () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
      projects: [
        {
          name: 'che',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse/che.git',
            },
            checkoutFrom: {
              revision: 'che-13112',
            },
          },
        },
        {
          name: 'che-theia',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse-che/che-theia.git',
            },
            checkoutFrom: {
              revision: 'issue-12321',
            },
          },
        },
      ],
    };

    devfileService.deleteGitProject(devfile, 'che-theia');

    expect(devfile.projects!.length).toBe(1);
    expect(devfile.projects![0].name).toBe('che');
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
    expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
  });

  test('Add project with custom location', () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
      projects: [
        {
          name: 'che',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse/che.git',
            },
            checkoutFrom: {
              revision: 'che-13112',
            },
          },
        },
      ],
    };

    devfileService.updateOrCreateGitProject(
      devfile,
      'theia/packages/che-theia',
      'https://github.com/eclipse-che/che-theia.git',
      'issue-12321'
    );

    expect(devfile.projects!.length).toBe(2);
    expect(devfile.projects![0].name).toBe('che');
    expect(devfile.projects![0].clonePath).toBe(undefined);
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
    expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
    expect(devfile.projects![1].name).toBe('che-theia');
    expect(devfile.projects![1].clonePath).toBe('theia/packages/che-theia');
    expect(devfile.projects![1].git?.remotes.origin).toBe('https://github.com/eclipse-che/che-theia.git');
    expect(devfile.projects![1].git?.checkoutFrom?.revision).toBe('issue-12321');
  });

  test('Delete project with custom location', () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
      projects: [
        {
          name: 'che',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse/che.git',
            },
            checkoutFrom: {
              revision: 'che-13112',
            },
          },
        },
        {
          name: 'che-theia',
          clonePath: 'theia/packages/che-theia',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse-che/che-theia.git',
            },
            checkoutFrom: {
              revision: 'issue-12321',
            },
          },
        },
      ],
    };

    devfileService.deleteGitProject(devfile, 'theia/packages/che-theia');

    expect(devfile.projects!.length).toBe(1);
    expect(devfile.projects![0].name).toBe('che');
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
    expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
  });

  test('Update two projects', async () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
      projects: [
        {
          name: 'theia',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse-theia/theia.git',
            },
          },
        },
        {
          name: 'che-theia-factory-extension',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse/che-theia-factory-extension.git',
            },
            checkoutFrom: {
              revision: 'v42.0',
            },
          },
        },
      ],
    };

    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');
    expect(devfile.projects![1].git?.remotes.origin).toBe('https://github.com/eclipse/che-theia-factory-extension.git');

    devfileService.updateOrCreateGitProject(
      devfile,
      'che-theia-factory-extension',
      'https://github.com/sunix/che-theia-factory-extension.git',
      'wip-sunix'
    );
    expect(devfile.projects![1].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
    expect(devfile.projects![1].git?.checkoutFrom?.revision).toBe('wip-sunix');

    devfileService.updateOrCreateGitProject(
      devfile,
      '/che/che-theia-factory-extension',
      'https://github.com/sunix/che-theia-factory-extension.git',
      'wip-theia'
    );
    expect(devfile.projects![2].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
    expect(devfile.projects![2].git?.checkoutFrom?.revision).toBe('wip-theia');
    expect(devfile.projects![2].name).toBe('che-theia-factory-extension');
  });

  test('Update and delete projects', async () => {
    const devfile: che.devfile.Devfile = {
      apiVersion: '1.0.0',
      metadata: {},
      projects: [
        {
          name: 'theia',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse-theia/theia.git',
            },
            checkoutFrom: {
              revision: 'che-13112',
            },
          },
        },
        {
          name: 'che-theia-factory-extension',
          git: {
            remotes: {
              origin: 'https://github.com/eclipse/che-theia-factory-extension.git',
            },
            checkoutFrom: {
              revision: 'v42.0',
            },
          },
        },
      ],
    };

    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');
    expect(devfile.projects![1].git?.remotes.origin).toBe('https://github.com/eclipse/che-theia-factory-extension.git');

    devfileService.deleteGitProject(devfile, 'che-theia-factory-extension');

    expect(devfile.projects!.length).toBe(1);
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');

    devfileService.deleteGitProject(devfile, 'theia');
    expect(devfile.projects!.length).toBe(0);

    devfileService.updateOrCreateGitProject(
      devfile,
      'che/che-theia-factory-extension',
      'https://github.com/sunix/che-theia-factory-extension.git',
      'wip-theia'
    );

    expect(devfile.projects!.length).toBe(1);
    expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
    expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('wip-theia');
    expect(devfile.projects![0].name).toBe('che-theia-factory-extension');

    devfileService.deleteGitProject(devfile, 'che/che-theia-factory-extension');

    expect(devfile.projects!.length).toBe(0);
  });

  test('Create a git project in a Devfile', async () => {
    getDevfileMock.mockReturnValue({
      metadata: {},
      projects: [
        {
          name: 'che-theia',
        },
      ],
    });

    await devfileService.updateProject('/projects/che-theia', 'https://github.com/eclipse-che/che-theia.git', 'main');

    expect(getDevfileMock).toBeCalledTimes(1);
    expect(updateDevfileMock).toBeCalledTimes(1);
  });

  test('Do NOT create a project when given Uri is not defined', async () => {
    await devfileService.updateProject('', '', '');

    expect(getDevfileMock).toBeCalledTimes(0);
    expect(updateDevfileMock).toBeCalledTimes(0);
  });

  test('Delete a project from Devfile', async () => {
    getDevfileMock.mockReturnValue(devfile_Without_Attributes);

    await devfileService.deleteProject('/projects/che-theia');

    expect(getDevfileMock).toBeCalledTimes(1);
    expect(updateDevfileMock).toBeCalledTimes(1);
    expect(deleteProjectSpy).toBeCalledTimes(1);
  });

  test('Do NOT delete a project when given Uri is not defined', async () => {
    await devfileService.deleteProject('');

    expect(getDevfileMock).toBeCalledTimes(0);
    expect(updateDevfileMock).toBeCalledTimes(0);
    expect(deleteProjectSpy).toBeCalledTimes(0);
  });
});
