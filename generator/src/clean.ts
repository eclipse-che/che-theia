/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Clean up Theia repository:
 * 1. Remove symbolic links in 'packages' folder
 * 2. Remove 'che' folder
 * 3. Remove 'assembly' folder
 * 4. Remove 'node_modules' folder
 */
export class Clean {
    constructor(
        private readonly assemblyFolder: string,
        private readonly cheFolder: string,
        private readonly packagesFolder: string,
        private readonly pluginsFolder: string,
        private readonly nodeModules: string
    ) {}

    cleanCheTheia(): void {
        console.log('Removing extension symbolic links...');
        const packages = fs.readdirSync(this.packagesFolder);
        for (const pack of packages) {
            const extPath = path.resolve(this.packagesFolder, pack);
            const stat = fs.lstatSync(extPath);
            if (stat.isSymbolicLink()) {
                fs.unlinkSync(extPath);
            }
        }
        console.log('Removing plugin symbolic links...');
        const plugins = fs.readdirSync(this.pluginsFolder);
        for (const plugin of plugins) {
            const pluginPath = path.resolve(this.pluginsFolder, plugin);
            const stat = fs.lstatSync(pluginPath);
            if (stat.isSymbolicLink()) {
                fs.unlinkSync(pluginPath);
            }
        }
        console.log('Removing plugins folder...');
        fs.removeSync(this.pluginsFolder);

        console.log('Removing extensions...');
        fs.removeSync(this.cheFolder);
        console.log('Removing assembly...');
        fs.removeSync(this.assemblyFolder);

        // we also need to clean up node_modules
        console.log('Removing "node_modules"...');
        fs.removeSync(this.nodeModules);
    }
}
