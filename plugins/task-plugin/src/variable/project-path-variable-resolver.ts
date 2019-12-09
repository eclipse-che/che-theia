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
import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';
import * as startPoint from '../task-plugin-backend';

const VARIABLE_NAME = 'current.project.path';
const PROJECTS_ROOT_VARIABLE = 'CHE_PROJECTS_ROOT';
const ERROR_MESSAGE_TEMPLATE = 'Can not resolve \'current.project.path\' variable.';
/**
 * Contributes the variable for getting path for current project as a relative path to the first directory under the root workspace.
 * 
 * @deprecated will be removed soon. Use ${workspaceFolder} macro instead.
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

        return this.projectsRoot;
    }

    private createVariable(): che.Variable {
        return {
            name: VARIABLE_NAME,
            description: 'The path of the project root folder',
            resolve: async () => this.resolve(),
            isResolved: this.isResolved
        };
    }

    private onError(error: string) {
        this.isResolved = false;

        const errorMessage = `${ERROR_MESSAGE_TEMPLATE} ${error}`;
        theia.window.showErrorMessage(errorMessage);
        return Promise.reject(errorMessage);
    }
}
