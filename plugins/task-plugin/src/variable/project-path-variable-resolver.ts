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

const VARIABLE_NAME = 'current.project.path';
const SELECTED_CONTEXT_COMMAND = 'theia.plugin.workspace.selectedContext';
const PROJECTS_ROOT_VARIABLE = 'CHE_PROJECTS_ROOT';
const ERROR_MESSAGE_TEMPLATE = 'Can not resolve \'current.project.path\' variable.';
/**
 * Contributes the variable for getting path for current project as a relative path to the first directory under the root workspace.
 */
@injectable()
export class ProjectPathVariableResolver {
    private projectsRoot: string | undefined;
    private isResolved: boolean = false;

    async registerVariables(): Promise<void> {
        this.projectsRoot = await theia.env.getEnvVariable(PROJECTS_ROOT_VARIABLE);

        const variableSubscription = await che.variables.registerVariable(this.createVariable());
        startPoint.getSubscriptions().push(variableSubscription);
    }

    async resolve(): Promise<string> {
        if (!this.projectsRoot) {
            return this.onError('Projects root is not set');
        }

        const selections = await theia.commands.executeCommand<Uri[]>(SELECTED_CONTEXT_COMMAND);
        if (!selections || selections.length < 1) {
            return this.onError('Please select a project.');
        }

        const selection = selections[0];
        const selectionPath = selection.path;
        const workspaceFolder = theia.workspace.getWorkspaceFolder(theia.Uri.file(selectionPath));
        if (!workspaceFolder) {
            return this.onError('Selection doesn\'t match any workspace folder.');
        }

        const workspaceFolderPath = workspaceFolder.uri.path;
        if (workspaceFolderPath === this.projectsRoot) {
            const splittedSelectionUri = selectionPath.substring(workspaceFolderPath.length).split('/');
            const project = splittedSelectionUri.shift() || splittedSelectionUri.shift();

            this.isResolved = true;
            return `${this.projectsRoot}/${project}`;
        }

        if (workspaceFolderPath.startsWith(this.projectsRoot)) {
            this.isResolved = true;
            return workspaceFolderPath;
        }

        return this.onError('The selection isn\'t under the current workspace root folder.');
    }

    private createVariable(): che.Variable {
        return {
            name: VARIABLE_NAME,
            description: 'The path of the project root folder',
            resolve: async () => this.resolve(),
            isResolved: this.isResolved
        };
    }

    private onError(error?: string) {
        this.isResolved = false;

        const errorMessage = error ? `${ERROR_MESSAGE_TEMPLATE} ${error}` : ERROR_MESSAGE_TEMPLATE;
        theia.window.showErrorMessage(errorMessage);
        return Promise.reject(errorMessage);
    }
}
