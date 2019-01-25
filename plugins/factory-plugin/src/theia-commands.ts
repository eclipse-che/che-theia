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
import { che as cheApi } from '@eclipse-che/api';
import * as fileuri from './file-uri';

const CHE_TASK_TYPE = 'che';

/**
 * Enumeration ID's of ide actions.
 */
export enum ActionId {
    OPEN_FILE = 'openFile',
    RUN_COMMAND = 'runCommand'
}

export class TheiaCloneCommand {

    private locationURI: string | undefined;
    private folder: string;
    private checkoutBranch?: string | undefined;

    constructor(project: cheApi.workspace.ProjectConfig, projectsRoot: string) {
        this.locationURI = project.source && project.source.location ? project.source.location : undefined;
        this.folder = projectsRoot + project.path;
        this.checkoutBranch = project.source && project.source.parameters && project.source.parameters['branch'] ?
            project.source.parameters['branch'] : undefined;
    }

    execute(): PromiseLike<void> {
        if (!this.locationURI) {
            return new Promise(() => { });
        }

        return theia.commands.executeCommand('git.clone', this.locationURI, this.folder, this.checkoutBranch)
            .then((repo) => {
                theia.window.showInformationMessage(`Project ${this.locationURI} cloned! to ${repo}`);
            }, e => {
                theia.window.showErrorMessage(`Couldnt clone ${this.locationURI}: ${e.message}`);
                console.log(`Couldnt clone ${this.locationURI}`, e);
            });
    }

}

export class TheiaCommand {

    constructor(
        protected readonly id: string,
        protected readonly properties?: {
            name?: string,
            file?: string,
            greetingTitle?: string,
            greetingContentUrl?: string
        }
    ) {
    }

    execute(): PromiseLike<void> {
        if (this.id === ActionId.OPEN_FILE) {
            if (this.properties && this.properties.file) {
                const fileLocation = fileuri.convertToFileURI(this.properties.file);
                return theia.commands.executeCommand('file-search.openFile', fileLocation)
                    .then(() => {

                    }, e => {
                        theia.window.showErrorMessage(`Could not open file: ${e.message}`);
                        console.log(`Could not open file `, e);
                    });
            }
        }

        if (this.id === ActionId.RUN_COMMAND) {
            if (this.properties) {
                return theia.commands.executeCommand('task:run', CHE_TASK_TYPE, this.properties.name)
                    .then(() => {
                        theia.window.showInformationMessage(`Executed che command succesfully`);
                    }, e => {
                        theia.window.showErrorMessage(`Could not execute Che command: ${e.message}`);
                        console.log(`Could not execute Che command`, e);
                    });
            }
        }

        return new Promise(() => { console.error('action nor openfile nor run command'); });
    }

}
