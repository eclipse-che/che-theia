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
import * as fs from 'fs-extra';
import * as git from './git';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { DevfileService, DevfileServiceImpl } from './devfile-service';
import { TheiaImportCommand, buildProjectImportCommand } from './theia-commands';

import { WorkspaceFolderUpdaterImpl } from './workspace-folder-updater';

/**
 * che default workspaces name
 * see extensions/eclipse-che-theia-workspace/src/node/che-workspace-server.ts
 */
const CHE_DEFAULT_WORKSPACE_ROOT_NAME = 'che.theia-workspace';

const onDidCloneSourcesEmitter = new theia.EventEmitter<void>();

export const onDidCloneSources = onDidCloneSourcesEmitter.event;

export class WorkspaceProjectsManager {
  protected watchers: theia.FileSystemWatcher[] = [];

  protected workspaceFolderUpdater = new WorkspaceFolderUpdaterImpl();
  protected devfileService: DevfileService;

  private output: theia.OutputChannel;

  constructor(protected pluginContext: theia.PluginContext, protected projectsRoot: string) {
    this.output = theia.window.createOutputChannel('workspace-plugin');

    this.devfileService = new DevfileServiceImpl(projectsRoot);
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

    const cloningPromise = this.executeCloneCommands(cloneCommandList);
    theia.window.withProgress({ location: { viewId: 'explorer' } }, () => cloningPromise);
    await cloningPromise;
    const { workspaceFile, workspaceFolders = [] } = theia.workspace;
    const isCustomWorkspaceRoot =
      workspaceFile && path.basename(workspaceFile.path) !== CHE_DEFAULT_WORKSPACE_ROOT_NAME;

    // Backward compatibility for single-root workspaces
    // we need it to support workspaces which were created before switching multi-root mode to ON by default
    for (const project of projects) {
      const projectPath = this.getProjectPath(project);
      const shouldAddedToWorkspace =
        !isCustomWorkspaceRoot || workspaceFolders.some(each => each.uri.path === projectPath);
      if (!shouldAddedToWorkspace) {
        return;
      }
      if (await fs.pathExists(projectPath)) {
        await this.workspaceFolderUpdater.addWorkspaceFolder(projectPath);
      }
    }

    // Quick fix for https://github.com/eclipse/che/issues/21244
    // Considering 99% of the workspaces are single-project,
    // there is no need to update the Devfile automatically.
    // await this.watchWorkspaceProjects();
    // await this.watchMultiRootProjects();
  }

  async buildCloneCommands(projects: che.devfile.DevfileProject[]): Promise<TheiaImportCommand[]> {
    const instance = this;

    const commands: TheiaImportCommand[] = [];

    for (const project of projects) {
      const projectPath = this.getProjectPath(project);
      if (!(await fs.pathExists(projectPath))) {
        const command = buildProjectImportCommand(project, instance.projectsRoot);
        if (command) {
          commands.push(command);
        }
      }
    }

    return commands;
  }

  private async executeCloneCommands(cloneCommandList: TheiaImportCommand[]): Promise<void> {
    if (cloneCommandList.length === 0) {
      return;
    }

    theia.window.showInformationMessage('Che Workspace: Starting importing projects.');

    const cloningPromises: Promise<string>[] = [];
    for (const cloneCommand of cloneCommandList) {
      try {
        let cloningPromise = cloneCommand.execute();

        cloningPromise = cloningPromise.then(async projectPath => {
          await this.workspaceFolderUpdater.addWorkspaceFolder(projectPath);
          return projectPath;
        });

        cloningPromises.push(cloningPromise);
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
    gitConfigWatcher.onDidCreate(uri => this.onProjectChanged(git.getGitRootFolder(uri.path)));
    gitConfigWatcher.onDidChange(uri => this.onProjectChanged(git.getGitRootFolder(uri.path)));
    gitConfigWatcher.onDidDelete(uri => this.onProjectRemoved(git.getGitRootFolder(uri.path)));
    this.watchers.push(gitConfigWatcher);

    this.pluginContext.subscriptions.push(
      theia.Disposable.create(() => {
        this.watchers.forEach(watcher => watcher.dispose());
      })
    );
  }

  async watchMultiRootProjects(): Promise<void> {
    if (await fs.pathExists(this.projectsRoot)) {
      fs.watch(this.projectsRoot, undefined, async (eventType, filename) => {
        const projectPath = path.resolve(this.projectsRoot, filename);
        if (await fs.pathExists(projectPath)) {
          if ((await fs.lstat(projectPath)).isDirectory()) {
            await this.workspaceFolderUpdater.addWorkspaceFolder(projectPath);
            await this.onProjectChanged(projectPath);
          }
        } else {
          await this.workspaceFolderUpdater.removeWorkspaceFolder(projectPath);
          await this.onProjectRemoved(projectPath);
        }
      });
    }
  }

  async onProjectChanged(projectPath: string): Promise<void> {
    const branch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectPath);
    if (!branch || !branch.remoteURL) {
      this.output.appendLine(`Could not detect git project branch for ${projectPath}`);
      return;
    }

    try {
      await this.devfileService.updateProject(projectPath, branch.remoteURL, branch.branch);
    } catch (error) {
      this.output.appendLine(error.message ? error.message : error);
    }
  }

  async onProjectRemoved(projectPath: string): Promise<void> {
    try {
      await this.devfileService.deleteProject(projectPath);
    } catch (error) {
      this.output.appendLine(error.message ? error.message : error);
    }
  }
}
