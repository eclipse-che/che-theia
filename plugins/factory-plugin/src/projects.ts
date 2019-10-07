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

// devfile projects handling

/**
 * Updates configuration of existing project or create new if such project doesn't exist.
 *
 * @param projects list of all projects in workspace
 * @param projectPath relative path of the added/updated project according to projects root directory (no slash at the beginning).
 *                    If project root directory is located directly in projects root directory it is the same as project name.
 * @param projectGitLocation link to git project, the same as used for git clone
 * @param projectGitRemoteBranch git branch of the project
 */
export function updateOrCreateGitProjectInDevfile(
    projects: cheApi.workspace.devfile.Project[],
    projectPath: string | undefined,
    projectGitLocation: string,
    projectGitRemoteBranch: string
): cheApi.workspace.devfile.Project[] {
    if (!projects) {
        projects = [];
    }

    const filteredProject = projects.filter(project => (project.clonePath ? project.clonePath : project.name) === projectPath);
    if (filteredProject.length === 0) {
        const projectName = projectPath!.split('/').pop();
        if (projectPath === projectName) {
            projectPath = undefined;
        }
        // create a new one
        projects.push({
            name: projectName ? projectName : 'new-project',
            source: {
                location: projectGitLocation,
                type: 'git',
                branch: projectGitRemoteBranch
            },
            clonePath: projectPath
        });
        return projects;
    }

    filteredProject.forEach(project => {
        if (!project.source) {
            project.source = {
                location: projectGitLocation,
                type: 'git',
                branch: projectGitRemoteBranch
            };
        }
        project.source.location = projectGitLocation;
        project.source.branch = projectGitRemoteBranch;
        delete project.source.startPoint;
        delete project.source.tag;
        delete project.source.commitId;
    });

    return projects;
}

/**
 * Deletes configuration of existing project.
 * Does nothing if project doesn't exist.
 *
 * @param projects list of projects in workspace
 * @param projectPath relative path of the project to delete according to projets root directory
 */
export function deleteProjectFromDevfile(
    projects: cheApi.workspace.devfile.Project[],
    projectPath: string
): cheApi.workspace.devfile.Project[] {
    if (!projects) {
        projects = [];
    }

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const currentProjectPath = project.clonePath ? project.clonePath : project.name;
        if (currentProjectPath === projectPath) {
            projects.splice(i, 1);
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
        const currentProjectPath = project.path ? project.path : project.name;
        if (currentProjectPath === projectPath) {
            projects.splice(i, 1);
            break;
        }
    }

    return projects;
}
