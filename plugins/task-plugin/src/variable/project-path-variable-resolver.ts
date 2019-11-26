/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import Uri from 'vscode-uri';
import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';
import * as startPoint from '../task-plugin-backend';

const fs = require('fs');

const VARIABLE_NAME = 'current.project.path';
const SELECTED_CONTEXT_COMMAND = 'theia.plugin.workspace.selectedContext';
const PROJECTS_ROOT_VARIABLE = 'CHE_PROJECTS_ROOT';
const SELECT_PROJECT_MESSAGE = 'Please select a project before executing a command to make it possible to resolve the current project path.';
/**
 * Contributes the variable for getting path for current project as a relative path to the first directory under the root workspace.
 */
@injectable()
export class ProjectPathVariableResolver {
    private projectsRoot: string;

    async registerVariables(): Promise<void> {
        const projectsRoot = await theia.env.getEnvVariable(PROJECTS_ROOT_VARIABLE);
        if (projectsRoot === undefined) {
            return Promise.reject('Projects root is not provided');
        }

        this.projectsRoot = projectsRoot;

        const variableSubscription = await che.variables.registerVariable(this.createVariable());
        startPoint.getSubscriptions().push(variableSubscription);
    }

    async resolve(): Promise<string> {
        let value = '';

        const selections = await theia.commands.executeCommand<Uri[]>(SELECTED_CONTEXT_COMMAND);

        if (selections !== undefined && selections.length === 1) {
            // retrieve project path from selection
            const relPath = selections[0].path.substring(this.projectsRoot.length).split('/');
            const project = relPath.shift() || relPath.shift();

            if (project !== undefined) {
                value = `${this.projectsRoot}/${project}`;
            }
        } else {
            // get project folder from workspace folders, first folder in workspaceFolders is .theia
            const folders = fs.readdirSync(this.projectsRoot, { withFileTypes: false });

            if (folders !== undefined && folders.length === 2) {
                value = `${this.projectsRoot}/${folders[1]}`;
            }
        }

        if (value.length === 0) {
            theia.window.showWarningMessage(SELECT_PROJECT_MESSAGE);
        }

        return value;
    }

    private createVariable(): che.Variable {
        return {
            name: VARIABLE_NAME,
            description: 'The path of the project root folder',
            resolve: async () => this.resolve(),
            isResolved: false
        };
    }
}
