/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as fileUri from './file-uri';
import * as fs from 'fs';
import * as git from './git';
import * as path from 'path';
import * as projectsHelper from './projects';
import * as theia from '@theia/plugin';

import { TheiaImportCommand, buildProjectImportCommand } from './theia-commands';

import { che as cheApi } from '@eclipse-che/api';

const onDidCloneSourcesEmitter = new theia.EventEmitter<void>();
export const onDidCloneSources = onDidCloneSourcesEmitter.event;

export function handleWorkspaceProjects(pluginContext: theia.PluginContext, projectsRoot: string): void {
  che.workspace.getCurrentWorkspace().then((workspace: cheApi.workspace.Workspace) => {
    new WorkspaceProjectsManager(pluginContext, projectsRoot).run();
  });
}

export class WorkspaceProjectsManager {
  watchers: theia.FileSystemWatcher[] = [];

  constructor(protected pluginContext: theia.PluginContext, protected projectsRoot: string) {}

  async run(): Promise<void> {
    if (!theia.workspace.name) {
      // no workspace opened, so nothing to clone / watch
      return;
    }

    const workspace = await che.workspace.getCurrentWorkspace();
    const cloneCommandList = await this.buildCloneCommands(workspace);

    const cloningPromise = this.executeCloneCommands(cloneCommandList);
    theia.window.withProgress({ location: { viewId: 'explorer' } }, () => cloningPromise);

    await cloningPromise;

    await this.startSyncWorkspaceProjects();
  }

  async buildCloneCommands(workspace: cheApi.workspace.Workspace): Promise<TheiaImportCommand[]> {
    const instance = this;

    const projects = workspace.devfile!.projects;
    if (!projects) {
      return [];
    }

    return projects
      .filter(project => {
        const projectPath = project.clonePath
          ? path.join(instance.projectsRoot, project.clonePath)
          : path.join(instance.projectsRoot, project.name!);
        return !fs.existsSync(projectPath);
      })
      .map(project => buildProjectImportCommand(project, instance.projectsRoot)!);
  }

  private async executeCloneCommands(cloneCommandList: TheiaImportCommand[]): Promise<void> {
    if (cloneCommandList.length === 0) {
      return;
    }

    theia.window.showInformationMessage('Che Workspace: Starting importing projects.');

    const cloningPromises: PromiseLike<void>[] = [];
    for (const cloneCommand of cloneCommandList) {
      const cloningPromise = cloneCommand.execute();

      cloningPromises.push(cloningPromise);

      cloningPromise.then(() => {
        const workspaceFolders = theia.workspace.workspaceFolders;
        theia.workspace.updateWorkspaceFolders(workspaceFolders ? workspaceFolders.length : 0, undefined, {
          uri: theia.Uri.file(cloneCommand.getProjectPath()),
        });
      });
    }

    await Promise.all(cloningPromises);
    theia.window.showInformationMessage('Che Workspace: Finished importing projects.');
    onDidCloneSourcesEmitter.fire();
  }

  async startSyncWorkspaceProjects(): Promise<void> {
    const gitConfigPattern = '**/.git/{HEAD,config}';
    const gitConfigWatcher = theia.workspace.createFileSystemWatcher(gitConfigPattern);
    gitConfigWatcher.onDidCreate(uri => this.updateOrCreateProjectInWorkspace(git.getGitRootFolder(uri.path)));
    gitConfigWatcher.onDidChange(uri => this.updateOrCreateProjectInWorkspace(git.getGitRootFolder(uri.path)));
    gitConfigWatcher.onDidDelete(uri => this.deleteProjectInWorkspace(git.getGitRootFolder(uri.path)));
    this.watchers.push(gitConfigWatcher);

    this.pluginContext.subscriptions.push(
      theia.Disposable.create(() => {
        this.watchers.forEach(watcher => watcher.dispose());
      })
    );
  }

  async updateOrCreateProjectInWorkspace(projectFolderURI: string | undefined): Promise<void> {
    if (!projectFolderURI) {
      return;
    }

    const currentWorkspace = await che.workspace.getCurrentWorkspace();
    if (!currentWorkspace || !currentWorkspace.id) {
      console.error('Unexpected error: current workspace id is not defined');
      return;
    }

    await this.updateOrCreateProject(currentWorkspace, projectFolderURI);

    await che.workspace.update(currentWorkspace.id, currentWorkspace);
  }

  async updateOrCreateProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): Promise<void> {
    const projectUpstreamBranch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectFolderURI);
    if (!projectUpstreamBranch || !projectUpstreamBranch.remoteURL) {
      console.error(`Could not detect git project branch for ${projectFolderURI}`);
      return;
    }

    projectsHelper.updateOrCreateGitProjectInDevfile(
      workspace.devfile!.projects!,
      fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot),
      projectUpstreamBranch.remoteURL,
      projectUpstreamBranch.branch
    );
  }

  async deleteProjectInWorkspace(projectFolderURI: string | undefined): Promise<void> {
    if (!projectFolderURI) {
      return;
    }
    const currentWorkspace = await che.workspace.getCurrentWorkspace();
    if (!currentWorkspace.id) {
      console.error('Unexpected error: current workspace id is not defined');
      return;
    }

    this.deleteProject(currentWorkspace, projectFolderURI);

    await che.workspace.update(currentWorkspace.id, currentWorkspace);
  }

  deleteProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): void {
    projectsHelper.deleteProjectFromDevfile(
      workspace.devfile!.projects!,
      fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot)
    );
  }
}
