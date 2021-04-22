/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as projecthelper from '../src/projects';

describe('Devfile: Projects:', () => {
  describe('Testing basic functionality:', () => {
    test('Should be able to create project if no projects defined', () => {
      const devfile: che.devfile.Devfile = {
        apiVersion: '1.0.0',
        metadata: {},
        projects: [],
      };

      projecthelper.updateOrCreateGitProjectInDevfile(
        devfile,
        'che',
        'https://github.com/eclipse/che.git',
        'che-13112'
      );

      expect(devfile.projects!.length).toBe(1);
      expect(devfile.projects![0].name).toBe('che');
      expect(devfile.projects![0].clonePath).toBe(undefined);
      expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
    });

    test('Should be able to add project into existing projects list', () => {
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

      projecthelper.updateOrCreateGitProjectInDevfile(
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

    test('Should be able to delete existing project', () => {
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

      projecthelper.deleteProjectFromDevfile(devfile, 'che-theia');

      expect(devfile.projects!.length).toBe(1);
      expect(devfile.projects![0].name).toBe('che');
      expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
    });

    test('Should be able to add project with custom location', () => {
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

      projecthelper.updateOrCreateGitProjectInDevfile(
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

    test('Should be able to delete project with custom location', () => {
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

      projecthelper.deleteProjectFromDevfile(devfile, 'theia/packages/che-theia');

      expect(devfile.projects!.length).toBe(1);
      expect(devfile.projects![0].name).toBe('che');
      expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('che-13112');
    });
  });

  describe('Testing projects updater when file is triggered:', () => {
    test('update and create project', async () => {
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
      expect(devfile.projects![1].git?.remotes.origin).toBe(
        'https://github.com/eclipse/che-theia-factory-extension.git'
      );

      projecthelper.updateOrCreateGitProjectInDevfile(
        devfile,
        'che-theia-factory-extension',
        'https://github.com/sunix/che-theia-factory-extension.git',
        'wip-sunix'
      );
      expect(devfile.projects![1].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
      expect(devfile.projects![1].git?.checkoutFrom?.revision).toBe('wip-sunix');

      projecthelper.updateOrCreateGitProjectInDevfile(
        devfile,
        '/che/che-theia-factory-extension',
        'https://github.com/sunix/che-theia-factory-extension.git',
        'wip-theia'
      );
      expect(devfile.projects![2].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
      expect(devfile.projects![2].git?.checkoutFrom?.revision).toBe('wip-theia');
      expect(devfile.projects![2].name).toBe('che-theia-factory-extension');
    });

    test('Delete project', async () => {
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
      expect(devfile.projects![1].git?.remotes.origin).toBe(
        'https://github.com/eclipse/che-theia-factory-extension.git'
      );

      projecthelper.deleteProjectFromDevfile(devfile, 'che-theia-factory-extension');

      expect(devfile.projects!.length).toBe(1);
      expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');

      projecthelper.deleteProjectFromDevfile(devfile, 'theia');
      expect(devfile.projects!.length).toBe(0);

      projecthelper.updateOrCreateGitProjectInDevfile(
        devfile,
        'che/che-theia-factory-extension',
        'https://github.com/sunix/che-theia-factory-extension.git',
        'wip-theia'
      );

      expect(devfile.projects!.length).toBe(1);
      expect(devfile.projects![0].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
      expect(devfile.projects![0].git?.checkoutFrom?.revision).toBe('wip-theia');
      expect(devfile.projects![0].name).toBe('che-theia-factory-extension');

      projecthelper.deleteProjectFromDevfile(devfile, 'che/che-theia-factory-extension');

      expect(devfile.projects!.length).toBe(0);
    });
  });
});
