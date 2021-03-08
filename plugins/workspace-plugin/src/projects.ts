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
  projects: che.devfile.DevfileProject[] | undefined,
  projectPath: string | undefined,
  projectGitLocation: string,
  projectGitRemoteBranch: string
): che.devfile.DevfileProject[] {
  if (!projects) {
    projects = [];
  }

  const filteredProject = projects.filter(
    project => (project.clonePath ? project.clonePath : project.name) === projectPath
  );
  if (filteredProject.length === 0) {
    const projectName = projectPath!.split('/').pop();
    if (projectPath === projectName) {
      projectPath = undefined;
    }
    // create a new one
    projects.push({
      name: projectName ? projectName : 'new-project',
      git: {
        remotes: {
          origin: projectGitLocation,
        },
        checkoutFrom: {
          revision: projectGitRemoteBranch,
        },
      },
      clonePath: projectPath,
    });
    return projects;
  }

  filteredProject.forEach(project => {
    if (!project.git) {
      project.git = {
        remotes: {
          origin: projectGitLocation,
        },
        checkoutFrom: {
          revision: projectGitRemoteBranch,
        },
      };
    }
    const defaultRemote = project.git.checkoutFrom?.remote || Object.keys(project.git.remotes)[0];
    project.git.remotes[defaultRemote] = projectGitLocation;
    if (!project.git.checkoutFrom) {
      project.git.checkoutFrom = {
        revision: projectGitRemoteBranch,
      };
    } else {
      project.git.checkoutFrom.revision = projectGitRemoteBranch;
    }
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
  projects: che.devfile.DevfileProject[] | undefined,
  projectPath: string
): che.devfile.DevfileProject[] {
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
