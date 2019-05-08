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
import * as path from 'path';

// devfile projects handling

export function updateOrCreateGitProjectInDevfile(
    projects: cheApi.workspace.devfile.Project[],
    projectPath: string,
    projectGitLocation: string,
    projectGitRemoteBranch: string
): cheApi.workspace.devfile.Project[] {

    if (!projects) {
        projects = [];
    }

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const currentProjectPath = project.clonePath ? project.clonePath : path.sep + project.name;
        if (currentProjectPath === projectPath) {
            project.source.type = 'git';
            project.source.location = projectGitLocation;
            project.source.branch = projectGitRemoteBranch;

            return projects;
        }
    }

    // project not found in the list of existed, create a new one
    const projectPathSegments = projectPath.split('/');
    const isCustomPath = projectPathSegments.filter(segment => segment !== '').length !== 1;
    const projectName = projectPathSegments.pop();

    const newProject: cheApi.workspace.devfile.Project = {
        'name': projectName ? projectName : 'new-project',
        'source': {
            'type': 'git',
            'location': projectGitLocation,
            'branch': projectGitRemoteBranch
        }
    };

    if (isCustomPath) {
        newProject.clonePath = projectPath;
    }

    projects.push(newProject);

    return projects;
}

export function deleteProjectFromDevfile(
    projects: cheApi.workspace.devfile.Project[],
    projectPath: string
): cheApi.workspace.devfile.Project[] {

    if (!projects || projects.length === 0) {
        return [];
    }

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const currentProjectPath = project.clonePath ? project.clonePath : path.sep + project.name;
        if (currentProjectPath === projectPath) {
            projects.splice(i);
            break;
        }
    }

    return projects;
}

// workspace config projects handling

export function updateOrCreateGitProjectInWorkspaceConfig(
    projects: cheApi.workspace.ProjectConfig[],
    projectPath: string,
    projectGitLocation: string,
    projectGitRemoteBranch: string
): cheApi.workspace.ProjectConfig[] {
    const filteredProject = projects.filter(project => project.path === projectPath);
    if (filteredProject.length === 0) {
        const projectName = projectPath.split('/').pop();

        // create a new one
        projects.push({
            'name': projectName ? projectName : 'new-project',
            'attributes': {},
            'source': {
                'location': projectGitLocation,
                'type': 'git',
                'parameters': {
                    'branch': projectGitRemoteBranch
                }
            },
            'path': projectPath,
            'description': '',
            'mixins': []
        });
        return projects;
    }

    filteredProject.forEach(project => {
        if (!project.source) {
            project.source = {
                'type': 'git',
                'location': projectGitLocation,
                'parameters': {
                    'branch': projectGitRemoteBranch
                }
            };
        }
        project.source.location = projectGitLocation;
        if (!project.source.parameters) {
            project.source.parameters = {};
        }
        project.source.parameters['branch'] = projectGitRemoteBranch;
        delete project.source.parameters['startPoint'];
        delete project.source.parameters['tag'];
        delete project.source.parameters['commitId'];
    });

    return projects;
}

export function deleteProjectFromWorkspaceConfig(
    projects: cheApi.workspace.ProjectConfig[],
    projectPath: string
): cheApi.workspace.ProjectConfig[] {
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        if (project.path === projectPath) {
            projects.splice(i);
            break;
        }
    }

    return projects;
}
