/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import * as projecthelper from '../src/projects';

describe('Devfile: Projects:', () => {
    const CHE_REPOSITORY = 'https://github.com/eclipse/che.git';
    const CHE_THEIA_REPOSITORY = 'https://github.com/eclipse/che-theia.git';
    const BRANCH1 = 'che-13112';
    const BRANCH2 = 'issue-12321';
    const CUSTOM_PROJECT_PATH = '/theia/packages/che-theia';

    test('Should be able to create project if no projects defined', () => {
        const projects: cheApi.workspace.devfile.Project[] = [];

        projecthelper.updateOrCreateGitProjectInDevfile(
            projects,
            '/che',
            CHE_REPOSITORY,
            BRANCH1
        );

        expect(projects.length).toBe(1);
        expect(projects[0].name).toBe('che');
        expect(projects[0].source.location).toBe(CHE_REPOSITORY);
        expect(projects[0].source.branch).toBe(BRANCH1);
    });

    test('Should be able to add project into existing projects list', () => {
        const projects: cheApi.workspace.devfile.Project[] = [
            {
                name: 'che',
                source: {
                    type: 'git',
                    location: CHE_REPOSITORY,
                    branch: BRANCH1
                }
            }
        ];

        projecthelper.updateOrCreateGitProjectInDevfile(
            projects,
            '/che-theia',
            CHE_THEIA_REPOSITORY,
            BRANCH2
        );

        expect(projects.length).toBe(2);

        expect(projects[0].name).toBe('che');
        expect(projects[0].source.location).toBe(CHE_REPOSITORY);
        expect(projects[0].source.branch).toBe(BRANCH1);

        expect(projects[1].name).toBe('che-theia');
        expect(projects[1].source.location).toBe(CHE_THEIA_REPOSITORY);
        expect(projects[1].source.branch).toBe(BRANCH2);
    });

    test('Should be able to delete existing project', () => {
        const projects: cheApi.workspace.devfile.Project[] = [
            {
                name: 'che',
                source: {
                    type: 'git',
                    location: CHE_REPOSITORY,
                    branch: BRANCH1
                }
            },
            {
                name: 'che-theia',
                source: {
                    type: 'git',
                    location: CHE_THEIA_REPOSITORY,
                    branch: BRANCH2
                }
            }
        ];

        projecthelper.deleteProjectFromDevfile(
            projects,
            '/che-theia'
        );

        expect(projects.length).toBe(1);

        expect(projects[0].name).toBe('che');
        expect(projects[0].source.location).toBe(CHE_REPOSITORY);
        expect(projects[0].source.branch).toBe(BRANCH1);
    });

    test('Should be able to add project with custom location', () => {
        const projects: cheApi.workspace.devfile.Project[] = [
            {
                name: 'che',
                source: {
                    type: 'git',
                    location: CHE_REPOSITORY,
                    branch: BRANCH1
                }
            }
        ];

        projecthelper.updateOrCreateGitProjectInDevfile(
            projects,
            CUSTOM_PROJECT_PATH,
            CHE_THEIA_REPOSITORY,
            BRANCH2
        );

        expect(projects.length).toBe(2);

        expect(projects[0].name).toBe('che');
        expect(projects[0].source.location).toBe(CHE_REPOSITORY);
        expect(projects[0].source.branch).toBe(BRANCH1);

        expect(projects[1].name).toBe('che-theia');
        expect(projects[1].clonePath).toBe(CUSTOM_PROJECT_PATH);
        expect(projects[1].source.location).toBe(CHE_THEIA_REPOSITORY);
        expect(projects[1].source.branch).toBe(BRANCH2);
    });

    test('Should be able to delete project with custom location', () => {
        const projects: cheApi.workspace.devfile.Project[] = [
            {
                name: 'che',
                source: {
                    type: 'git',
                    location: CHE_REPOSITORY,
                    branch: BRANCH1
                }
            },
            {
                name: 'che-theia',
                clonePath: CUSTOM_PROJECT_PATH,
                source: {
                    type: 'git',
                    location: CHE_THEIA_REPOSITORY,
                    branch: BRANCH2
                }
            }
        ];

        projecthelper.deleteProjectFromDevfile(
            projects,
            CUSTOM_PROJECT_PATH
        );

        expect(projects.length).toBe(1);

        expect(projects[0].name).toBe('che');
        expect(projects[0].source.location).toBe(CHE_REPOSITORY);
        expect(projects[0].source.branch).toBe(BRANCH1);
    });
});

describe('Workspace config: Testing projects updater when file is triggered', () => {

    test('update and create project', async () => {
        const projects: cheApi.workspace.ProjectConfig[] = [
            {
                'name': 'theia',
                'attributes': {},
                'source': {
                    'location': 'https://github.com/theia-ide/theia.git',
                    'type': 'git',
                    'parameters': {}
                },
                'path': '/theia',
                'description': '',
                'mixins': [],
                'problems': []
            },
            {
                'links': [],
                'name': 'che-theia-factory-extension',
                'attributes': {},
                'type': 'blank',
                'source': {
                    'location': 'https://github.com/eclipse/che-theia-factory-extension.git',
                    'type': 'git',
                    'parameters': {
                        'branch': 'master',
                        'tag': 'v42.0'
                    }
                },
                'path': '/che-theia-factory-extension',
                'description': '',
                'mixins': [],
                'problems': []
            }
        ];
        expect(projects[0].source.location).toBe('https://github.com/theia-ide/theia.git');
        expect(projects[1].source.location).toBe('https://github.com/eclipse/che-theia-factory-extension.git');

        projecthelper.updateOrCreateGitProjectInWorkspaceConfig(projects,
                                               '/che-theia-factory-extension',
                                               'https://github.com/sunix/che-theia-factory-extension.git',
                                               'wip-sunix');
        expect(projects[1].source.location).toBe('https://github.com/sunix/che-theia-factory-extension.git');
        expect(projects[1].source.parameters['branch']).toBe('wip-sunix');
        expect(projects[1].source.parameters['tag']).toBe(undefined);

        projecthelper.updateOrCreateGitProjectInWorkspaceConfig(projects,
                                               '/che/che-theia-factory-extension',
                                               'https://github.com/sunix/che-theia-factory-extension.git',
                                               'wip-theia');
        expect(projects[2].source.location).toBe('https://github.com/sunix/che-theia-factory-extension.git');
        expect(projects[2].source.parameters['branch']).toBe('wip-theia');
        expect(projects[2].name).toBe('che-theia-factory-extension');
    });

    test('delete project', async () => {
        const projects: cheApi.workspace.ProjectConfig[] = [
            {
                'name': 'theia',
                'attributes': {},
                'source': {
                    'location': 'https://github.com/theia-ide/theia.git',
                    'type': 'git',
                    'parameters': {}
                },
                'path': '/theia',
                'description': '',
                'mixins': [],
                'problems': []
            },
            {
                'links': [],
                'name': 'che-theia-factory-extension',
                'attributes': {},
                'type': 'blank',
                'source': {
                    'location': 'https://github.com/eclipse/che-theia-factory-extension.git',
                    'type': 'git',
                    'parameters': {
                        'branch': 'master'
                    }
                },
                'path': '/che-theia-factory-extension',
                'description': '',
                'mixins': [],
                'problems': []
            }
        ];
        expect(projects[0].source.location).toBe('https://github.com/theia-ide/theia.git');
        expect(projects[1].source.location).toBe('https://github.com/eclipse/che-theia-factory-extension.git');

        projecthelper.deleteProjectFromWorkspaceConfig(projects, '/che-theia-factory-extension');
        expect(projects.length).toBe(1);
        expect(projects[0].source.location).toBe('https://github.com/theia-ide/theia.git');

        projecthelper.deleteProjectFromWorkspaceConfig(projects, '/theia');
        expect(projects.length).toBe(0);

        projecthelper.updateOrCreateGitProjectInWorkspaceConfig(projects,
                                               '/che/che-theia-factory-extension',
                                               'https://github.com/sunix/che-theia-factory-extension.git',
                                               'wip-theia');
        expect(projects.length).toBe(1);
        expect(projects[0].source.location).toBe('https://github.com/sunix/che-theia-factory-extension.git');
        expect(projects[0].source.parameters['branch']).toBe('wip-theia');
        expect(projects[0].name).toBe('che-theia-factory-extension');

        projecthelper.deleteProjectFromWorkspaceConfig(projects, '/che/che-theia-factory-extension');
        expect(projects.length).toBe(0);
    });
});
