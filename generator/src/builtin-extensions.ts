/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
import * as axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yargs from 'yargs';
import { Logger } from './logger';

/**
 * Downloads builtin extensions.
 * @author Anatolii Bazko
 */
export class BuiltinExtensions {
    static argBuilder = (theYargs: yargs.Argv) => {
        return theYargs.option('plugins', {
            description: 'Plugins folder to download VS Code builtin extension into.',
            alias: 'p',
        }).option('extensions', {
            description: 'List of VS Code builtin extensions to download.',
            alias: 'e',
        });
    }

    constructor(
        protected readonly pluginsFolder: string, protected readonly extensions?: string) {
    }

    async download(): Promise<string[]> {
        const downloaded = [];

        await fs.ensureDir(this.pluginsFolder);
        const srcDir = path.resolve(__dirname, '../src');
        const confDir = path.join(srcDir, 'conf');
        const extensions = this.extensions || await fs.readFile(path.join(confDir, 'builtin-extensions'));

        Logger.info(`Downloading extensions into '${this.pluginsFolder}' started`);

        for (const extension of extensions.toString().split('\n')) {
            if (!extension.trim() || extension.startsWith('//')) {
                continue;
            }

            Logger.info(`Downloading '${extension}'`);
            try {
                await this.downloadExtension(extension);
                downloaded.push(extension);
            } catch (error) {
                Logger.error(error);
            }
        }

        Logger.info('Downloading extensions completed.');
        return downloaded;
    }

    protected async downloadExtension(extension: string): Promise<void> {
        const response = await axios.default.get(extension);
        const filename = extension.substring(extension.lastIndexOf('/') + 1);

        fs.writeFileSync(path.resolve(this.pluginsFolder, filename), response.data);
    }
}
