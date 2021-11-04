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
import * as fileUri from './file-uri';

export interface DevfileService {
  updateProject(projectPath: string, remoteURL: string, branch: string): Promise<void>;
  deleteProject(projectPath: string): Promise<void>;
}

export class DevfileServiceImpl {
  promiseChain: Promise<void> = Promise.resolve();

  constructor(protected projectsRoot: string) {}

  async updateProject(projectPath: string, remoteURL: string, branch: string): Promise<void> {
    if (!projectPath || !remoteURL) {
      return;
    }

    // remember the last promise in promise chain
    const previousPromise = this.promiseChain;

    // create a promise, that will add a workspace folder
    this.promiseChain = new Promise<void>((resolve, reject) => {
      previousPromise
        .catch(err => {
          console.log(err && err.message ? err.message : err);
        })
        .then(async () => {
          try {
            const devfile = await che.devfile.get();

            this.updateOrCreateGitProject(
              devfile,
              fileUri.toRelativePath(projectPath, this.projectsRoot),
              remoteURL,
              branch
            );

            await che.devfile.update(devfile);
          } catch (error) {
            reject(new Error(`Devfile: failure to add/update project ${projectPath}`));
            return;
          }

          resolve();
        });
    });

    return this.promiseChain;
  }

  async deleteProject(projectPath: string): Promise<void> {
    if (!projectPath) {
      return;
    }

    // remember the last promise in promise chain
    const previousPromise = this.promiseChain;

    // create a promise, that will add a workspace folder
    this.promiseChain = new Promise<void>((resolve, reject) => {
      previousPromise
        .catch(err => {
          console.log(err && err.message ? err.message : err);
        })
        .then(async () => {
          try {
            const relativePath = fileUri.toRelativePath(projectPath, this.projectsRoot);

            const devfile = await che.devfile.get();
            const devfileChanged = this.deleteGitProject(devfile, relativePath);
            if (devfileChanged) {
              await che.devfile.update(devfile);
            }
          } catch (error) {
            reject(new Error(`Devfile: failure to delete project ${projectPath}`));
            return;
          }

          resolve();
        });
    });

    return this.promiseChain;
  }

  /**
   * Updates configuration of existing project or create new if such project doesn't exist.
   *
   * @param projects list of all projects in workspace
   * @param projectPath relative path of the added/updated project according to projects root directory (no slash at the beginning).
   *                    If project root directory is located directly in projects root directory it is the same as project name.
   * @param projectGitLocation link to git project, the same as used for git clone
   * @param projectGitRemoteBranch git branch of the project
   */
  updateOrCreateGitProject(
    devfile: che.devfile.Devfile,
    projectPath: string | undefined,
    projectGitLocation: string,
    projectGitRemoteBranch: string
  ): void {
    if (!devfile.projects) {
      devfile.projects = [];
    }

    const filteredProject = devfile.projects.filter(project => (project.clonePath || project.name) === projectPath);

    if (filteredProject.length === 0) {
      const projectName = projectPath!.split('/').pop();
      if (projectPath === projectName) {
        projectPath = undefined;
      }

      // create a new one
      devfile.projects.push({
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

      return;
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
        return;
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
  }

  /**
   * Deletes configuration of existing project.
   * Does nothing if project doesn't exist.
   *
   * @param projects list of projects in workspace
   * @param projectPath relative path of the project to delete according to projets root directory
   */
  deleteGitProject(devfile: che.devfile.Devfile, relativePath: string): boolean {
    if (devfile.projects) {
      for (let i = 0; i < devfile.projects.length; i++) {
        const project = devfile.projects[i];
        if (relativePath === (project.clonePath || project.name)) {
          devfile.projects.splice(i, 1);
          return true;
        }
      }
    }

    return false;
  }
}
