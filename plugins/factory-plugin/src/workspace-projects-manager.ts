/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TheiaCloneCommand } from './theia-commands';
import * as git from './git';
import * as projectsHelper from "./projects";
import * as fileUri from "./file-uri";
import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';

const fs = require('fs');

/**
 * Make synchronization between projects defined in Che workspace and theia projects.
 */
export class WorkspaceProjectsManager {

    watchers: theia.FileSystemWatcher[] = [];

    constructor(protected pluginContext: theia.PluginContext, protected projectsRoot: string) {
    }

    async run() {

        const workspace = await che.workspace.getCurrentWorkspace();
        const cloneCommandList = await this.selectProjectToCloneCommands(workspace);
        await this.executeCloneCommands(cloneCommandList);

        await this.startSyncWorkspaceProjects();

    }

    async selectProjectToCloneCommands(workspace: cheApi.workspace.Workspace): Promise<TheiaCloneCommand[]> {
        const instance = this;

        const projects = workspace.config!.projects;
        if (!projects) {
            return [];
        }

        return projects
            .filter(project => !fs.existsSync(instance.projectsRoot + project.path))
            .map(project => new TheiaCloneCommand(project, instance.projectsRoot));
    }

    private async executeCloneCommands(cloneCommandList: TheiaCloneCommand[]) {
        if (cloneCommandList.length === 0) {
            return;
        }

        theia.window.showInformationMessage("Che Workspace: Starting cloning projects.");
        await Promise.all(
            cloneCommandList.map(cloneCommand => cloneCommand.execute())
        );
        theia.window.showInformationMessage("Che Workspace: Finished cloning projects.");
    }

    async startSyncWorkspaceProjects() {
        const gitConfigPattern = '**/.git/{HEAD,config}';
        const gitConfigWatcher = theia.workspace.createFileSystemWatcher(gitConfigPattern);
        gitConfigWatcher.onDidCreate(uri => this.updateOrCreateGitProjectInWorkspace(git.getGitRootFolder(uri.path)));
        gitConfigWatcher.onDidChange(uri => this.updateOrCreateGitProjectInWorkspace(git.getGitRootFolder(uri.path)));
        gitConfigWatcher.onDidDelete(uri => this.deleteGitProjectInWorkspace(git.getGitRootFolder(uri.path)));
        this.watchers.push(gitConfigWatcher);

        this.pluginContext.subscriptions.push(theia.Disposable.create(() => {
            this.watchers.forEach(watcher => watcher.dispose());
        }));
    }

    async updateOrCreateGitProjectInWorkspace(projectFolderURI: string | undefined) {
        if (!projectFolderURI) {
            return;
        }
        const currentWorkspace = await che.workspace.getCurrentWorkspace();
        if (!currentWorkspace || !currentWorkspace.id) {
            console.error('Unexpected error: current workspace id is not defined');
            return;
        }

        const projectUpstreamBranch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectFolderURI);
        if (!projectUpstreamBranch || !projectUpstreamBranch.remoteURL) {
            console.error(`Could not detect git project branch for ${projectFolderURI}`);
            return;
        }

        if (!currentWorkspace.config) {
            currentWorkspace.config = {};
        }

        if (!currentWorkspace.config.projects) {
            currentWorkspace.config.projects = [];
        }

        projectsHelper.updateOrCreateGitProject(currentWorkspace.config.projects,
            fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot),
            projectUpstreamBranch.remoteURL,
            projectUpstreamBranch.branch);

        await che.workspace.update(currentWorkspace.id, currentWorkspace);
    }

    async deleteGitProjectInWorkspace(projectFolderURI: string | undefined) {
        if (!projectFolderURI) {
            return;
        }
        const currentWorkspace = await che.workspace.getCurrentWorkspace();
        if (!currentWorkspace.id) {
            console.error('Unexpected error: current workspace id is not defined');
            return;
        }

        if (!currentWorkspace.config) {
            currentWorkspace.config = {};
        }

        if (!currentWorkspace.config.projects) {
            currentWorkspace.config.projects = [];
        }

        projectsHelper.deleteGitProject(currentWorkspace.config.projects,
            fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot)
        );

        await che.workspace.update(currentWorkspace.id, currentWorkspace);
    }
}
