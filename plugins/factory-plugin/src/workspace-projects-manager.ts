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
import * as projectsHelper from './projects';
import * as fileUri from './file-uri';
import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';

export function handleWorkspaceProjects(pluginContext: theia.PluginContext, projectsRoot: string): void {
    che.workspace.getCurrentWorkspace().then((workspace: cheApi.workspace.Workspace) => {
        if (workspace.devfile) {
            new DevfileProjectsManager(pluginContext, projectsRoot).run();
        } else {
            new WorkspaceConfigProjectsManager(pluginContext, projectsRoot).run();
        }
    });
}

abstract class WorkspaceProjectsManager {
    watchers: theia.FileSystemWatcher[] = [];

    constructor(
        protected pluginContext: theia.PluginContext,
        protected projectsRoot: string
    ) { }

    abstract async selectProjectToCloneCommands(workspace: cheApi.workspace.Workspace): Promise<TheiaCloneCommand[]>;
    abstract async updateOrCreateProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): Promise<void>;
    abstract deleteProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): void;

    async run(workspace?: cheApi.workspace.Workspace) {
        if (!workspace) {
            workspace = await che.workspace.getCurrentWorkspace();
        }
        const cloneCommandList = await this.selectProjectToCloneCommands(workspace);
        await this.executeCloneCommands(cloneCommandList);

        await this.startSyncWorkspaceProjects();
    }

    private async executeCloneCommands(cloneCommandList: TheiaCloneCommand[]) {
        if (cloneCommandList.length === 0) {
            return;
        }

        theia.window.showInformationMessage('Che Workspace: Starting cloning projects.');
        let workspaceUpdate = Promise.resolve();
        await Promise.all(
            cloneCommandList.map(cloneCommand => {
                cloneCommand.clone().then(() => {
                    workspaceUpdate = workspaceUpdate.then(() => cloneCommand.updateWorkpace());
                });
            })
        );
        await workspaceUpdate;
        theia.window.showInformationMessage('Che Workspace: Finished cloning projects.');
    }

    async startSyncWorkspaceProjects() {
        const gitConfigPattern = '**/.git/{HEAD,config}';
        const gitConfigWatcher = theia.workspace.createFileSystemWatcher(gitConfigPattern);
        gitConfigWatcher.onDidCreate(uri => this.updateOrCreateProjectInWorkspace(git.getGitRootFolder(uri.path)));
        gitConfigWatcher.onDidChange(uri => this.updateOrCreateProjectInWorkspace(git.getGitRootFolder(uri.path)));
        gitConfigWatcher.onDidDelete(uri => this.deleteProjectInWorkspace(git.getGitRootFolder(uri.path)));
        this.watchers.push(gitConfigWatcher);

        this.pluginContext.subscriptions.push(theia.Disposable.create(() => {
            this.watchers.forEach(watcher => watcher.dispose());
        }));
    }

    async updateOrCreateProjectInWorkspace(projectFolderURI: string | undefined) {
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

    async deleteProjectInWorkspace(projectFolderURI: string | undefined) {
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
}

/**
 * Make synchronization between projects defined in Che workspace devfile and theia projects.
 */
export class DevfileProjectsManager extends WorkspaceProjectsManager {

    async selectProjectToCloneCommands(workspace: cheApi.workspace.Workspace): Promise<TheiaCloneCommand[]> {
        const instance = this;

        const projects = workspace.devfile.projects;
        if (!projects) {
            return [];
        }

        return projects
            .map(project => new TheiaCloneCommand(project, instance.projectsRoot));
    }

    async updateOrCreateProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): Promise<void> {
        const projectUpstreamBranch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectFolderURI);
        if (!projectUpstreamBranch || !projectUpstreamBranch.remoteURL) {
            console.error(`Could not detect git project branch for ${projectFolderURI}`);
            return;
        }

        projectsHelper.updateOrCreateGitProjectInDevfile(
            workspace.devfile.projects,
            fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot),
            projectUpstreamBranch.remoteURL,
            projectUpstreamBranch.branch);
    }

    deleteProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): void {
        projectsHelper.deleteProjectFromDevfile(
            workspace.devfile.projects,
            fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot)
        );
    }

}

/**
 * Make synchronization between projects defined in Che workspace config and theia projects.
 */
export class WorkspaceConfigProjectsManager extends WorkspaceProjectsManager {

    async selectProjectToCloneCommands(workspace: cheApi.workspace.Workspace): Promise<TheiaCloneCommand[]> {
        const instance = this;

        const projects = workspace.config!.projects;
        if (!projects) {
            return [];
        }

        return projects
            .map(project => new TheiaCloneCommand(project, instance.projectsRoot));
    }

    async updateOrCreateProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): Promise<void> {
        const projectUpstreamBranch: git.GitUpstreamBranch | undefined = await git.getUpstreamBranch(projectFolderURI);
        if (!projectUpstreamBranch || !projectUpstreamBranch.remoteURL) {
            console.error(`Could not detect git project branch for ${projectFolderURI}`);
            return;
        }

        if (!workspace.config) {
            workspace.config = {};
        }

        if (!workspace.config.projects) {
            workspace.config.projects = [];
        }

        projectsHelper.updateOrCreateGitProjectInWorkspaceConfig(
            workspace.config.projects,
            '/' + fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot),
            projectUpstreamBranch.remoteURL,
            projectUpstreamBranch.branch);
    }

    deleteProject(workspace: cheApi.workspace.Workspace, projectFolderURI: string): void {
        if (!workspace.config) {
            workspace.config = {};
        }

        if (!workspace.config.projects) {
            workspace.config.projects = [];
            return;
        }

        projectsHelper.deleteProjectFromWorkspaceConfig(
            workspace.config.projects,
            '/' + fileUri.convertToCheProjectPath(projectFolderURI, this.projectsRoot)
        );
    }

}
