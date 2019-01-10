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
import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';

const fs = require('fs');

/**
 * Make synchronization between projects defined in Che workspace and theia projects.
 */
export class WorkspaceProjectsManager {

    constructor(protected projectsRoot: string) {
    }

    async run() {
        const workspace = await che.workspace.getCurrentWorkspace();

        const cloneCommandList = await this.selectProjectToCloneCommands(workspace);
        if (cloneCommandList.length === 0) {
            return;
        }

        await this.executeCloneCommands(cloneCommandList);
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
        theia.window.showInformationMessage("Che Workspace: Starting cloning projects.");

        await Promise.all(
            cloneCommandList.map(cloneCommand => cloneCommand.execute())
        );

        theia.window.showInformationMessage("Che Workspace: Finished cloning projects.");
    }

}
