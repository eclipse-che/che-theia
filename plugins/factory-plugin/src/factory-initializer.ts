/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';
import { TheiaCloneCommand, TheiaCommand } from './theia-commands';

export enum ActionId {
    OPEN_FILE = 'openFile',
    RUN_COMMAND = 'runCommand'
}

/**
 * Provides basic Eclipse Che factory features to be executed at startup of the Theia browser IDE:
 * - checking/retrieving factory-id from URL
 * - request che factory api to get the factory definition
 * - clone the projects defined in the factory definition
 * - checkout branch if needed
 */
export class FactoryInitializer {

    constructor(protected projectsRoot: string) {
    }

    async run() {
        const factoryId = theia.env.getQueryParameter('factory-id');

        if (!factoryId || typeof factoryId !== 'string') {
            return;
        }

        let factory: cheApi.factory.Factory;
        try {
            factory = await che.factory.getById(factoryId);
        } catch (e) {
            theia.window.showErrorMessage(`Unable to get factory. ${e.message}`);
            return;
        }

        // Clone Factory projects
        const cloneCommands = await this.getCloneCommands(factory);
        await this.executeCloneCommands(cloneCommands);

        // Perform actions after cloning Factory projects
        const onProjectsImportedCommands = this.getOnProjectsImportedCommands(factory);
        await this.executeOnProjectsImportedCommands(onProjectsImportedCommands);

        // TODO const onAppLoadedCommandList = factory.getOnAppLoadedActions().map(action => new TheiaCommand(action.id, action.parameters));
        // TODO const onAppClosedCommandList = factory.getOnAppLoadedActions().map(action => new TheiaCommand(action.id, action.parameters));
        // TODO register trigger for on appClosed ... onStop method ?
        // - on web app closed
        // TODO await this.executeOnAppLoadedCommands(onAppLoadedCommandList)
    }

    /**
     * Returns a list of commands to clone Factory projects
     */
    private async getCloneCommands(factory: cheApi.factory.Factory) {
        const instance = this;

        if (!factory.workspace || !factory.workspace.projects) {
            return [];
        }

        return factory.workspace.projects.map(
            project => new TheiaCloneCommand(project, instance.projectsRoot)
        );
    }

    /**
     * Returns a list of commands to be executed after cloning the projects
     */
    private getOnProjectsImportedCommands(factory: cheApi.factory.Factory) {
        if (!factory.ide || !factory.ide.onProjectsLoaded || !factory.ide.onProjectsLoaded.actions) {
            return [];
        }

        return factory.ide.onProjectsLoaded.actions.map(
            action => new TheiaCommand(action.id!, action.properties)
        );
    }

    private async executeCloneCommands(cloneCommands: TheiaCloneCommand[]) {
        if (cloneCommands.length === 0) {
            return;
        }

        let workspaceUpdate = Promise.resolve();
        await Promise.all(
            cloneCommands.map(cloneCommand => {
                cloneCommand.clone().then(() => {
                    workspaceUpdate = workspaceUpdate.then(() => cloneCommand.updateWorkpace());
                });
            })
        );
        await workspaceUpdate;

        theia.window.showInformationMessage('Che Factory: Finished cloning projects.');
    }

    private async executeOnProjectsImportedCommands(onProjectsImportedCommands: TheiaCommand[]) {
        if (onProjectsImportedCommands.length === 0) {
            return;
        }

        await Promise.all(
            onProjectsImportedCommands.map(command => command.execute())
        );

        theia.window.showInformationMessage("Che Factory: Finished executing 'onProjectImported' command actions.");
    }

}
