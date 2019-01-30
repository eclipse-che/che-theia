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

export function updateOrCreateGitProject(
    projects: cheApi.workspace.ProjectConfig[], projectPath: string, projectGitLocation: string, projectGitRemoteBranch: string): cheApi.workspace.ProjectConfig[] {

    const filteredProject = projects.filter(project => project.path === projectPath);

    if (filteredProject.length === 0) {
        const projectName = projectPath.split('/').pop();

        // create a new one
        projects.push({
            "name": projectName ? projectName : "new-project",
            "attributes": {},
            "source": {
                "location": projectGitLocation,
                "type": "git",
                "parameters": {
                    "branch": projectGitRemoteBranch
                }
            },
            "path": projectPath,
            "description": "",
            "mixins": []
        });
        return projects;
    }

    filteredProject.forEach(project => {
        if (!project.source) {
            project.source = {
                type: 'git',
                location: '',
                parameters: {}
            };
        }
        project.source.location = projectGitLocation;
        if (!project.source.parameters) {
            project.source.parameters = {};
        }
        project.source.parameters['branch'] = projectGitRemoteBranch;
    });

    return projects;
}

export function deleteGitProject(
    projects: cheApi.workspace.ProjectConfig[],
    projectPath: string): cheApi.workspace.ProjectConfig[] {

    projects
        .filter(project => project.path === projectPath)
        .forEach(project => {
            projects.splice(projects.indexOf(project));
        });

    return projects;
}
