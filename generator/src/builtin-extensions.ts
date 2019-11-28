/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import * as yargs from 'yargs';
import { Command } from './command';
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
        });
    }

    constructor(protected readonly pluginsFolder: string) {
    }

    async download(): Promise<string[]> {
        const downloaded = [];

        await fs.ensureDir(this.pluginsFolder);
        const srcDir = path.resolve(__dirname, '../src');
        const confDir = path.join(srcDir, 'conf');
        const extensions = await fs.readFile(path.join(confDir, 'builtin-extensions'));

        Logger.info(`Downloading extensions into '${this.pluginsFolder}' started`);

        for (const extension of extensions.toString().split('\n')) {
            if (!extension.trim() || extension.startsWith('//')) {
                continue;
            }

            Logger.info(`Downloading '${extension}'`);

            const url = await this.getExtensionUrl(extension);
            if (url) {
                const archive = await this.downloadExtension(url);
                if (archive) {
                    await this.unpackExtension(extension, archive);
                    downloaded.push(extension);
                }
            }
        }

        Logger.info('Downloading extensions completed.');
        return downloaded;
    }

    protected async getExtensionUrl(extension: string): Promise<string | undefined> {
        try {
            const url = await new Command(path.resolve(this.pluginsFolder)).exec(`npm info ${extension} dist.tarball`);
            if (url) {
                return url.trim();
            }
            Logger.error(`Tarball archive for '${extension}' not found.`);
        } catch (e) {
            Logger.error(e);
        }
    }

    protected async getExtensionName(extension: string): Promise<string | undefined> {
        try {
            const name = await new Command(path.resolve(this.pluginsFolder)).exec(`npm info ${extension} name`);
            if (name) {
                return name.trim();
            }
            Logger.error(`'${extension}' name not found.`);
        } catch (e) {
            Logger.error(e);
        }
    }

    protected async downloadExtension(downloadUrl: string): Promise<string | undefined> {
        try {
            const tmpFile = tmp.fileSync();
            await new Command(path.resolve(this.pluginsFolder)).exec(`wget -O ${tmpFile.name} ${downloadUrl}`);
            return tmpFile.name;
        } catch (e) {
            Logger.error(e);
        }
    }

    protected async unpackExtension(extension: string, archive: string): Promise<boolean> {
        try {
            const name = await this.getExtensionName(extension);
            if (!name) {
                return false;
            }

            const dirname = path.resolve(this.pluginsFolder, name.slice('@theia/'.length));
            fs.ensureDirSync(dirname);

            await new Command(path.resolve(this.pluginsFolder)).exec(`tar -xf ${archive} -C ${dirname} --strip-components 1`);
            await this.unpackNodeModules(dirname);

            return true;
        } catch (e) {
            Logger.error(e);
            return false;
        } finally {
            fs.removeSync(archive);
        }
    }

    protected async unpackNodeModules(extensionDir: string): Promise<void> {
        const nodeModules = fs.existsSync(path.resolve(extensionDir, 'vscode_node_modules.zip'));
        if (nodeModules) {
            await new Command(extensionDir).exec('mkdir node_modules | unzip vscode_node_modules.zip -d node_modules');
        }
    }
}
