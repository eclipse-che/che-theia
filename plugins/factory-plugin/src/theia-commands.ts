/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as path from 'path';
import * as theia from '@theia/plugin';
import { che as cheApi } from '@eclipse-che/api';
import * as fileuri from './file-uri';
import * as git from './git';

const CHE_TASK_TYPE = 'che';

/**
 * Enumeration ID's of ide actions.
 */
export enum ActionId {
    OPEN_FILE = 'openFile',
    RUN_COMMAND = 'runCommand'
}

function isDevfileProjectConfig(project: cheApi.workspace.ProjectConfig | cheApi.workspace.devfile.Project): project is cheApi.workspace.devfile.Project {
    return !!project.name && !!project.source && !!project.source.type && !!project.source.location && !project.source['parameters'];
}

export class TheiaCloneCommand {

    private locationURI: string | undefined;
    private folder: string;
    private checkoutBranch?: string | undefined;
    private checkoutTag?: string | undefined;
    private checkoutStartPoint?: string | undefined;
    private checkoutCommitId?: string | undefined;

    constructor(project: cheApi.workspace.ProjectConfig | cheApi.workspace.devfile.Project, projectsRoot: string) {
        if (isDevfileProjectConfig(project)) {
            const source = project.source;
            if (!source) {
                return;
            }

            this.locationURI = source.location;
            this.folder = project.clonePath ? path.join(projectsRoot, project.clonePath) : path.join(projectsRoot, project.name);
            this.checkoutBranch = source.branch;
            this.checkoutStartPoint = source.startPoint;
            this.checkoutTag = source.tag;
            this.checkoutCommitId = source.commitId;
        } else {
            // legacy project config
            if (!project.source || !project.source.parameters) {
                return;
            }
            const parameters = project.source.parameters;

            this.locationURI = project.source.location;
            this.folder = projectsRoot + project.path;
            this.checkoutBranch = parameters['branch'];
            this.checkoutStartPoint = parameters['startPoint'];
            this.checkoutTag = project.source.parameters['tag'];
            this.checkoutCommitId = project.source.parameters['commitId'];
        }
    }

    execute(): PromiseLike<void> {
        if (!this.locationURI) {
            return new Promise(() => { });
        }

        return theia.commands.executeCommand('git.clone', this.locationURI, this.folder, this.checkoutBranch)
            .then(repo => {
                // Figure out what to reset to.
                // The priority order is startPoint > tag > commitId

                const treeish = this.checkoutStartPoint
                    ? this.checkoutStartPoint
                    : (this.checkoutTag ? this.checkoutTag : this.checkoutCommitId);

                const branch = this.checkoutBranch ? this.checkoutBranch : 'default branch';
                const messageStart = `Project ${this.locationURI} cloned to ${repo} and checked out ${branch}`;

                if (treeish) {
                    git.execGit(this.folder, 'reset', '--hard', treeish)
                        .then(_ => {
                            theia.window.showInformationMessage(`${messageStart} which has been reset to ${treeish}.`);
                        }, e => {
                            theia.window.showErrorMessage(`${messageStart} but resetting to ${treeish} failed with ${e.message}.`);
                            console.log(`Couldn't reset to ${treeish} of ${repo} cloned from ${this.locationURI} and checked out to ${branch}.`, e);
                        });
                } else {
                    theia.window.showInformationMessage(`${messageStart}.`);
                }
            }, e => {
                theia.window.showErrorMessage(`Couldn't clone ${this.locationURI}: ${e.message}`);
                console.log(`Couldn't clone ${this.locationURI}`, e);
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
                        console.log('Could not open file ', e);
                    });
            }
        }

        if (this.id === ActionId.RUN_COMMAND) {
            if (this.properties) {
                return theia.commands.executeCommand('task:run', CHE_TASK_TYPE, this.properties.name)
                    .then(() => {
                        theia.window.showInformationMessage('Executed che command succesfully');
                    }, e => {
                        theia.window.showErrorMessage(`Could not execute Che command: ${e.message}`);
                        console.log('Could not execute Che command', e);
                    });
            }
        }

        return new Promise(() => { console.error('action nor openfile nor run command'); });
    }

}
