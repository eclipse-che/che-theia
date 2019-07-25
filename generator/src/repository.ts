/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import { CliError } from './cli-error';
import { Command } from './command';
import * as path from 'path';

/**
 * Allow to clone git repositories easily
 */
export class Repository {

    /**
     * Default constructor with the given URI
     * @param uri
     */
    constructor(private readonly uri: string) {

    }

    /**
     * Grab the repository name based on the given URI of repository.
     */
    public getRepositoryName(): string {
        // check dir exists
        const regex = /(https:\/\/*git*.*\/.*\/|file:\/\/.*\/)(.*)/gm;
        const folderDirExp = regex.exec(this.uri);
        if (!folderDirExp || folderDirExp.length < 1) {
            throw new CliError(`Invalid repository name: ${this.uri}`);
        }
        return folderDirExp[2];
    }

    /**
     * Performs the clone operation
     * @param checkoutFolder the CWD / directory where to launch the clone operation
     * @param dest the destination folder of the clone
     * @param checkoutTo the optional branch/tag to use when cloning
     */
    public async clone(checkoutFolder: string, dest: string, checkoutTo?: string): Promise<string> {
        const commandTheiaFolder = new Command(checkoutFolder);
        await commandTheiaFolder.exec(`git clone ${this.uri} ${dest}`);

        const clonedDir = path.resolve(checkoutFolder, dest);
        if (checkoutTo) {
            // need to change checkout
            const commandClonedDir = new Command(clonedDir);
            await commandClonedDir.exec(`git checkout -f ${checkoutTo}`);
        }

        return clonedDir;
    }
}
