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
      const projects: che.devfile.DevfileProject[] = [];

      projecthelper.updateOrCreateGitProjectInDevfile(
        projects,
        'che',
        'https://github.com/eclipse/che.git',
        'che-13112'
      );

      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('che');
      expect(projects[0].clonePath).toBe(undefined);
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(projects[0].git?.checkoutFrom?.revision).toBe('che-13112');
    });

    test('Should be able to add project into existing projects list', () => {
      const projects: che.devfile.DevfileProject[] = [
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
      ];

      projecthelper.updateOrCreateGitProjectInDevfile(
        projects,
        'che-theia',
        'https://github.com/eclipse-che/che-theia.git',
        'issue-12321'
      );

      expect(projects.length).toBe(2);
      expect(projects[0].name).toBe('che');
      expect(projects[0].clonePath).toBe(undefined);
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(projects[0].git?.checkoutFrom?.revision).toBe('che-13112');
      expect(projects[1].name).toBe('che-theia');
      expect(projects[1].clonePath).toBe(undefined);
      expect(projects[1].git?.remotes.origin).toBe('https://github.com/eclipse-che/che-theia.git');
      expect(projects[1].git?.checkoutFrom?.revision).toBe('issue-12321');
    });

    test('Should be able to delete existing project', () => {
      const projects: che.devfile.DevfileProject[] = [
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
      ];

      projecthelper.deleteProjectFromDevfile(projects, 'che-theia');

      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('che');
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(projects[0].git?.checkoutFrom?.revision).toBe('che-13112');
    });

    test('Should be able to add project with custom location', () => {
      const projects: che.devfile.DevfileProject[] = [
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
      ];

      projecthelper.updateOrCreateGitProjectInDevfile(
        projects,
        'theia/packages/che-theia',
        'https://github.com/eclipse-che/che-theia.git',
        'issue-12321'
      );

      expect(projects.length).toBe(2);
      expect(projects[0].name).toBe('che');
      expect(projects[0].clonePath).toBe(undefined);
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(projects[0].git?.checkoutFrom?.revision).toBe('che-13112');
      expect(projects[1].name).toBe('che-theia');
      expect(projects[1].clonePath).toBe('theia/packages/che-theia');
      expect(projects[1].git?.remotes.origin).toBe('https://github.com/eclipse-che/che-theia.git');
      expect(projects[1].git?.checkoutFrom?.revision).toBe('issue-12321');
    });

    test('Should be able to delete project with custom location', () => {
      const projects: che.devfile.DevfileProject[] = [
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
      ];

      projecthelper.deleteProjectFromDevfile(projects, 'theia/packages/che-theia');

      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('che');
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse/che.git');
      expect(projects[0].git?.checkoutFrom?.revision).toBe('che-13112');
    });
  });

  describe('Testing projects updater when file is triggered:', () => {
    test('update and create project', async () => {
      const projects: che.devfile.DevfileProject[] = [
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
      ];

      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');
      expect(projects[1].git?.remotes.origin).toBe('https://github.com/eclipse/che-theia-factory-extension.git');

      projecthelper.updateOrCreateGitProjectInDevfile(
        projects,
        'che-theia-factory-extension',
        'https://github.com/sunix/che-theia-factory-extension.git',
        'wip-sunix'
      );
      expect(projects[1].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
      expect(projects[1].git?.checkoutFrom?.revision).toBe('wip-sunix');

      projecthelper.updateOrCreateGitProjectInDevfile(
        projects,
        '/che/che-theia-factory-extension',
        'https://github.com/sunix/che-theia-factory-extension.git',
        'wip-theia'
      );
      expect(projects[2].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
      expect(projects[2].git?.checkoutFrom?.revision).toBe('wip-theia');
      expect(projects[2].name).toBe('che-theia-factory-extension');
    });

    test('delete project', async () => {
      const projects: che.devfile.DevfileProject[] = [
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
      ];

      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');
      expect(projects[1].git?.remotes.origin).toBe('https://github.com/eclipse/che-theia-factory-extension.git');
      projecthelper.deleteProjectFromDevfile(projects, 'che-theia-factory-extension');
      expect(projects.length).toBe(1);
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/eclipse-theia/theia.git');

      projecthelper.deleteProjectFromDevfile(projects, 'theia');
      expect(projects.length).toBe(0);

      projecthelper.updateOrCreateGitProjectInDevfile(
        projects,
        'che/che-theia-factory-extension',
        'https://github.com/sunix/che-theia-factory-extension.git',
        'wip-theia'
      );
      expect(projects.length).toBe(1);
      expect(projects[0].git?.remotes.origin).toBe('https://github.com/sunix/che-theia-factory-extension.git');
      expect(projects[0].git?.checkoutFrom?.revision).toBe('wip-theia');
      expect(projects[0].name).toBe('che-theia-factory-extension');
      projecthelper.deleteProjectFromDevfile(projects, 'che/che-theia-factory-extension');
      expect(projects.length).toBe(0);
    });
  });
});
