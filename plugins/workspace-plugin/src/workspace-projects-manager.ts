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
import * as fs from 'fs-extra';
import * as git from './git';
import * as path from 'path';
import * as projectsHelper from './projects';
import * as theia from '@theia/plugin';

import { TheiaImportCommand, buildProjectImportCommand } from './theia-commands';

import { WorkspaceFolderUpdaterImpl } from './workspace-folder-updater';

const onDidCloneSourcesEmitter = new theia.EventEmitter<void>();

export const onDidCloneSources = onDidCloneSourcesEmitter.event;

export class WorkspaceProjectsManager {
  protected watchers: theia.FileSystemWatcher[] = [];
  protected workspaceFolderUpdater = new WorkspaceFolderUpdaterImpl();

  private output: theia.OutputChannel;

  constructor(protected pluginContext: theia.PluginContext, protected projectsRoot: string) {
    this.output = theia.window.createOutputChannel('workspace-plugin');
  }

  getProjectPath(project: che.devfile.DevfileProject): string {
    return project.clonePath
      ? path.join(this.projectsRoot, project.clonePath)
      : path.join(this.projectsRoot, project.name);
  }

  async run(): Promise<void> {
    const devfile = await che.devfile.get();

    this.output.appendLine(`Found devfile ${JSON.stringify(devfile, undefined, 2)}`);

    const projects = devfile.projects || [];
    const cloneCommandList = await this.buildCloneCommands(projects);

    this.output.appendLine(`Clone commands are ${JSON.stringify(cloneCommandList, undefined, 2)}`);

    const isMultiRoot = devfile.metadata?.attributes?.multiRoot !== 'off';

    this.output.appendLine(`multi root is ${isMultiRoot}`);

    const cloningPromise = this.executeCloneCommands(cloneCommandList, isMultiRoot);
    theia.window.withProgress({ location: { viewId: 'explorer' } }, () => cloningPromise);
    await cloningPromise;

    if (isMultiRoot) {
      // Backward compatibility for single-root workspaces
      // we need it to support workspaces which were created before switching multi-root mode to ON by default
      projects
        .map(project => this.getProjectPath(project))
        .filter(projectPath => fs.existsSync(projectPath))
        .forEach(projectPath => this.workspaceFolderUpdater.addWorkspaceFolder(projectPath));
    }

    await this.watchWorkspaceProjects();

    if (isMultiRoot) {
      await this.watchMultiRootProjects();
    }
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

    const cloningPromises: Promise<string>[] = [];
    for (const cloneCommand of cloneCommandList) {
      try {
        let cloningPromise = cloneCommand.execute();

        if (isMultiRoot) {
          cloningPromise = cloningPromise.then(projectPath => {
            this.workspaceFolderUpdater.addWorkspaceFolder(projectPath);
            return projectPath;
          });
        }
      } catch (e) {
        this.output.appendLine(`Error while cloning: ${e}`);
        // we continue to clone other projects even if a clone process failed for a project
      }
    }
    await Promise.all(cloningPromises);

    theia.window.showInformationMessage('Che Workspace: Finished importing projects.');
    onDidCloneSourcesEmitter.fire();
  }

  async watchWorkspaceProjects(): Promise<void> {
    const gitConfigPattern = '**/.git/{HEAD,config}';
    const gitConfigWatcher = theia.workspace.createFileSystemWatcher(gitConfigPattern);
    gitConfigWatcher.onDidCreate(uri => this.updateOrCreateProjectInWorkspace(git.getGitRootFolder(uri.path)));
    gitConfigWatcher.onDidChange(uri => this.updateOrCreateProjectInWorkspace(git.getGitRootFolder(uri.path)));
    gitConfigWatcher.onDidDelete(uri => this.deleteProjectFromWorkspace(git.getGitRootFolder(uri.path)));
    this.watchers.push(gitConfigWatcher);

    this.pluginContext.subscriptions.push(
      theia.Disposable.create(() => {
        this.watchers.forEach(watcher => watcher.dispose());
      })
    );
  }

  async watchMultiRootProjects(): Promise<void> {
    if (fs.existsSync(this.projectsRoot)) {
      fs.watch(this.projectsRoot, undefined, async (eventType, filename) => {
        const projectPath = path.resolve(this.projectsRoot, filename);
        if (await fs.pathExists(projectPath)) {
          if ((await fs.lstat(projectPath)).isDirectory()) {
            await this.workspaceFolderUpdater.addWorkspaceFolder(projectPath);
          }
        } else {
          await this.workspaceFolderUpdater.removeWorkspaceFolder(projectPath);
        }
      });
    }
  }

  async updateOrCreateProjectInWorkspace(projectFolderPath: string): Promise<void> {
    if (!projectFolderPath) {
      return;
    }

    const devfile = await che.devfile.get();

    const projectUpstreamBranch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectFolderPath);
    if (!projectUpstreamBranch || !projectUpstreamBranch.remoteURL) {
      this.output.appendLine(`Could not detect git project branch for ${projectFolderPath}`);
      return;
    }

    projectsHelper.updateOrCreateGitProjectInDevfile(
      devfile.projects,
      fileUri.convertToCheProjectPath(projectFolderPath, this.projectsRoot),
      projectUpstreamBranch.remoteURL,
      projectUpstreamBranch.branch
    );

    await che.devfile.update(devfile);
  }

  async deleteProjectFromWorkspace(projectFolderPath: string): Promise<void> {
    if (!projectFolderPath) {
      return;
    }

    const devfile = await che.devfile.get();

    projectsHelper.deleteProjectFromDevfile(
      devfile.projects,
      fileUri.convertToCheProjectPath(projectFolderPath, this.projectsRoot)
    );

    await che.devfile.update(devfile);
  }
}
