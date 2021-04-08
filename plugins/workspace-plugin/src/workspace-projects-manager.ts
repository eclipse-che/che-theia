/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
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

import { WorkspaceFolderUpdater } from './workspace-folder-updater';

const onDidCloneSourcesEmitter = new theia.EventEmitter<void>();
export const onDidCloneSources = onDidCloneSourcesEmitter.event;

export function handleWorkspaceProjects(pluginContext: theia.PluginContext, projectsRoot: string): void {
  new WorkspaceProjectsManager(pluginContext, projectsRoot).run();
}

export class WorkspaceProjectsManager {
  protected watchers: theia.FileSystemWatcher[] = [];
  protected workspaceFolderUpdater = new WorkspaceFolderUpdater();
  private outputChannel: theia.OutputChannel;

  constructor(protected pluginContext: theia.PluginContext, protected projectsRoot: string) {
    this.outputChannel = theia.window.createOutputChannel('workspace-plugin');
  }

  getProjectPath(project: che.devfile.DevfileProject): string {
    return project.clonePath
      ? path.join(this.projectsRoot, project.clonePath)
      : path.join(this.projectsRoot, project.name);
  }

  async run(): Promise<void> {
    const devfile = await che.devfile.get();

    this.outputChannel.appendLine(`Found devfile ${JSON.stringify(devfile, undefined, 2)}`);

    const cloneCommandList = await this.buildCloneCommands(devfile.projects || []);

    this.outputChannel.appendLine(`Clone commands are ${JSON.stringify(cloneCommandList, undefined, 2)}`);

    const isMultiRoot = devfile.metadata?.attributes?.multiRoot !== 'off';

    this.outputChannel.appendLine(`multi root is ${isMultiRoot}`);

    const cloningPromise = this.executeCloneCommands(cloneCommandList, isMultiRoot);
    theia.window.withProgress({ location: { viewId: 'explorer' } }, () => cloningPromise);
    await cloningPromise;

    await this.startSyncWorkspaceProjects();
  }

  notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
  }

  async buildCloneCommands(projects: che.devfile.DevfileProject[]): Promise<TheiaImportCommand[]> {
    const instance = this;

    return projects
      .filter(project => !fs.existsSync(this.getProjectPath(project)))
      .map(project => buildProjectImportCommand(project, instance.projectsRoot))
      .filter(command => this.notUndefined(command)) as TheiaImportCommand[];
  }

  private async executeCloneCommands(cloneCommandList: TheiaImportCommand[], isMultiRoot: boolean): Promise<void> {
    if (cloneCommandList.length === 0) {
      return;
    }

    theia.window.showInformationMessage('Che Workspace: Starting importing projects.');

    const cloningPromises: PromiseLike<string>[] = [];
    for (const cloneCommand of cloneCommandList) {
      try {
        const cloningPromise = cloneCommand.execute();
        cloningPromises.push(cloningPromise);

        if (isMultiRoot) {
          cloningPromise.then(projectPath => this.workspaceFolderUpdater.addWorkspaceFolder(projectPath));
        }
      } catch (e) {
        this.outputChannel.appendLine(`Error while cloning: ${e}`);
        // we continue to clone other projects even if a clone process failed for a project
      }
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

    const devfile = await che.devfile.get();
    await this.updateOrCreateProject(devfile, projectFolderURI);
    await che.devfile.update(devfile);
  }

  async updateOrCreateProject(devfile: che.devfile.Devfile, projectFolderURI: string): Promise<void> {
    const projectUpstreamBranch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectFolderURI);
    if (!projectUpstreamBranch || !projectUpstreamBranch.remoteURL) {
      console.error(`Could not detect git project branch for ${projectFolderURI}`);
      return;
    }

    projectsHelper.updateOrCreateGitProjectInDevfile(
      devfile.projects,
      fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot),
      projectUpstreamBranch.remoteURL,
      projectUpstreamBranch.branch
    );
  }

  async deleteProjectInWorkspace(projectFolderURI: string | undefined): Promise<void> {
    if (!projectFolderURI) {
      return;
    }
    const devfile = await che.devfile.get();
    this.deleteProject(devfile, projectFolderURI);
    await che.devfile.update(devfile);
  }

  deleteProject(devfile: che.devfile.Devfile, projectFolderURI: string): void {
    projectsHelper.deleteProjectFromDevfile(
      devfile.projects,
      fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot)
    );
  }
}
