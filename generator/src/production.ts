/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
import * as fs from 'fs-extra';
import { Logger } from './logger';
import { Yarn } from './yarn';
import { CliError } from './cli-error';

import * as glob from 'glob-promise';
import * as path from 'path';
import { Command } from './command';

/**
 * Generates the assembly directory, copying only subset of files and cleaning up some folders
 * @author Florent Benoit
 */
export class Production {

    /**
     * Ensure we've no dependencies to these packages that bring a lot of dependencies !
     */
    private static FORBIDDEN_PACKAGES = ['webpack', 'webpack-cli', '@theia/application-manager'];

    /**
     * Remove these client dependencies as they're already bundled with webpack
     */
    private static EXCLUDED_PACKAGES = ['electron',
        'react',
        'react-virtualized',
        'onigasm',
        'oniguruma',
        '@theia/monaco',
        'monaco-css',
        'react-dom',
        'font-awesome',
        'monaco-html',
        '@theia/monaco-editor-core'];

    private dependencies: string[] = [];
    private toCopyFiles: string[] = [];
    private static readonly ASSEMBLY_DIRECTORY = path.resolve('examples/assembly');
    private command: Command;

    constructor(readonly rootFolder: string, readonly assemblyFolder: string, readonly productionDirectory: string) {
        this.dependencies = [];
        this.command = new Command(productionDirectory);
    }

    public async create(): Promise<string> {

        Logger.info('🗂  Get dependencies...');
        // get dependencies
        await this.getDependencies();

        Logger.info('🗃  Resolving files...');
        await this.resolveFiles();

        Logger.info('✍️  Copying files...');
        await this.copyFiles();

        Logger.info('✂️  Cleaning-up files...');
        await this.cleanup();

        Logger.info(`🎉  Theia production-ready available in ${this.productionDirectory}.`);

        return path.resolve(this.productionDirectory);
    }

    protected async copyFiles(): Promise<void> {
        const assemblyLength = this.assemblyFolder.length;
        const rootDirLength = this.rootFolder.length;
        await Promise.all(this.toCopyFiles.map((file) => {

            let destFile;
            if (file.startsWith(this.assemblyFolder)) {
                destFile = file.substring(assemblyLength);
            } else {
                destFile = file.substring(rootDirLength);
            }
            return fs.copy(file, path.join(this.productionDirectory, destFile));
        }));
    }

    protected async cleanup(): Promise<void> {
        const sizeBefore = await this.getSize();

        await this.yarnClean();
        await this.cleanupFind();
        const sizeAfter = await this.getSize();
        Logger.info('Removed :' + (sizeBefore - sizeAfter) + ' KiB');
    }

    protected async getSize(): Promise<number> {
        return parseInt(await this.command.exec('du -s -k . | cut -f1'), 10);
    }

    protected async yarnClean() {
        const yarnCleanFolder = path.resolve(__dirname, '../src/conf');
        const yarnCleanPath = path.join(yarnCleanFolder, '.yarnclean');

        await fs.copy(path.join(this.rootFolder, 'yarn.lock'), path.join(this.productionDirectory, 'yarn.lock'));
        const yarnCleanDestPath = path.join(this.productionDirectory, '.yarnclean');
        await fs.copy(yarnCleanPath, yarnCleanDestPath);
        const output = await this.command.exec('yarn autoclean --force');
        await fs.remove(yarnCleanDestPath);
        Logger.info(output);
    }

    protected async cleanupFind() {
        const cleanupFindFolder = path.resolve(__dirname, '../src/conf');

        const cleanupFindContent = await fs.readFile(path.join(cleanupFindFolder, 'cleanup-find'));
        const command = new Command(this.productionDirectory);
        await Promise.all(cleanupFindContent.toString().split('\n').map(async (line) => {
            if (line.length > 0 && !line.startsWith('#')) {
                await command.exec(`find . -name ${line} | xargs rm -rf {}`);
            }
        }));

    }

    public async resolveFiles(): Promise<boolean> {
        // check dependency folders are there
        this.dependencies.forEach((dependency) => {
            if (!fs.existsSync(dependency)) {
                throw new CliError('The dependency ' + dependency
                    + ' is referenced but is not available on the filesystem');
            }
        });

        // ok now, add all files from these dependencies
        const globOptions = { nocase: true, nosort: true, nodir: true, dot: true };
        this.toCopyFiles = this.toCopyFiles.concat.apply([],
            await Promise.all(this.dependencies.map(dependencyDirectory => {
                return glob.promise('**', Object.assign(globOptions, { cwd: dependencyDirectory }))
                    .then((data) => data.map((name) => path.join(dependencyDirectory, name)));
            })));
        // add as well the lib folder
        this.toCopyFiles = this.toCopyFiles.concat(
            await (glob.promise('lib/**', Object.assign(globOptions, { cwd: this.assemblyFolder }))
                .then((data) => data.map((name) => path.join(this.assemblyFolder, name)))));

        this.toCopyFiles = this.toCopyFiles.concat(
            await (glob.promise('src-gen/**', Object.assign(globOptions, { cwd: this.assemblyFolder }))
                .then((data) => data.map((name) => path.join(this.assemblyFolder, name)))));

        this.toCopyFiles = this.toCopyFiles.concat(path.join(this.assemblyFolder, 'package.json'));

        return Promise.resolve(true);

    }

    public async getDependencies(): Promise<boolean> {

        this.dependencies = (await new Yarn('',
            Production.ASSEMBLY_DIRECTORY,
            Production.FORBIDDEN_PACKAGES,
            Production.EXCLUDED_PACKAGES,
        ).getDependencies('@eclipse-che/theia-assembly'));
        return Promise.resolve(true);
    }

}
