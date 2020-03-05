/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
import * as jsYaml from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as readPkg from 'read-pkg';
import { Logger } from './logger';
import { Repository } from './repository';
import { CliError } from './cli-error';
import * as tmp from 'tmp';
import * as axios from 'axios';
import * as yargs from 'yargs';
/**
 * Init all sources of extensions and plugins by cloning them, creating symlinks, update package.json, etc.
 * @author Florent Benoit
 */
export class InitSources {

    /**
     * Prefix for extensions.
     */
    public static readonly PREFIX_PACKAGES_EXTENSIONS = '@che-';

    public static readonly DEFAULT_EXTENSIONS_URI = 'https://raw.githubusercontent.com/eclipse/che-theia/master/che-theia-init-sources.yml';
    static argBuilder = (theYargs: yargs.Argv) => {
        return theYargs.option('config', {
            description: 'Path to custom config file',
            alias: 'c',
        }).option('dev', {
            description: 'Initialize current Theia with Che/Theia extensions from "master" branch instead of provided branches',
            alias: 'd',
            type: 'boolean',
            default: false,
        }).option('alias', {
            description: 'Replace clone source location. If a local path is provided, it won\'t clone anything but use the folder as a source folder.',
            type: 'array'
        });
    }
    /**
     * Source clone locations could be replaced from the command line --alias option.
     */
    public sourceLocationAliases = new Map<string, string>();

    /**
     * Set of global dependencies
     */
    private globalDevDependencies = new Map<string, string>();

    /**
     * Will clone sources keeping or omiting the history
     */
    private keepHistory: boolean = true;

    /**
     * Constructor
     */
    constructor(readonly rootFolder: string,
        readonly packagesFolder: string,
        readonly pluginsFolder: string,
        readonly cheTheiaFolder: string,
        readonly assemblyFolder: string,
        readonly theiaVersion: string) {
    }

    /**
     * Keep or omit git history when cloning sources
     */
    set keepGitHistory(value: boolean) {
        this.keepHistory = value;
    }

    /**
     * Install all extensions
     */
    async generate(extensionsPath: string, isDevMode: boolean = false): Promise<void> {
        const extensionsYamlContent = await fs.readFile(extensionsPath);
        const extensionsYaml = jsYaml.load(extensionsYamlContent.toString());
        await this.initGlobalDependencies();

        await fs.ensureDir(this.cheTheiaFolder);

        await Promise.all(extensionsYaml.sources.map(async (extension: ISource) => {
            if (isDevMode) {
                extension.checkoutTo = 'master';
            }
            await this.addExtension(extension);
        }));

        await this.initRootCompilationUnits();

    }

    /**
     * Update configs/root-compilation.tsconfig.json
     */
    async initRootCompilationUnits() {

        const rootCompilationUnitPath = path.join(this.rootFolder, 'configs/root-compilation.tsconfig.json');
        const rawData = await fs.readFile(rootCompilationUnitPath);
        const parsed = JSON.parse(rawData.toString());

        // add assembly unit
        const item = {
            'path': '../examples/assembly/compile.tsconfig.json'
        };
        const assemblyTsConfig = (parsed['references'] as Array<{ 'path': string }>).find(reference => { return reference['path'] === item['path']; });
        if (!assemblyTsConfig) {
            parsed['references'].push(item);
        }

        // write it back
        const json = JSON.stringify(parsed, undefined, 2);
        await fs.writeFile(rootCompilationUnitPath, json);

    }

    /**
     * Scan package.json file and grab all dev dependencies and store them in globalDevDependencies variable
     */
    async initGlobalDependencies(): Promise<void> {
        const extensionPackage: any = await readPkg(path.join(this.rootFolder, 'package.json'), { normalize: false });

        const keys = Object.keys(extensionPackage.devDependencies);
        await Promise.all(keys.map(key => {
            this.globalDevDependencies.set(key, extensionPackage.devDependencies[key]);
        }));
    }

    /**
     * Adds an extension to the current theia
     * @param extension the extension to add
     */
    async addExtension(extension: ISource): Promise<void> {
        // dealing with aliases that may be passed to the command line
        const sourceAlias = this.sourceLocationAliases.get(extension.source);
        if (sourceAlias) {
            Logger.info(`Source alias detected for ${extension.source}, replacing with provided source: ${sourceAlias}`);
            extension.source = sourceAlias;
        }

        // first, clone
        await this.clone(extension);

        // perform symlink
        await this.symlink(extension);

        await this.updateDependencies(extension);

        // insert extensions
        await this.insertExtensionIntoAssembly(extension);

        // perform plugins
        await this.pluginsSymlink(extension);

    }

    /**
     * perform update of devDependencies or dependencies in package.json file of the cloned extension
     */
    async updateDependencies(extension: ISource, rewrite: boolean = true): Promise<void> {

        await Promise.all(extension.extSymbolicLinks.map(async symbolicLink => {
            // grab package.json
            const extensionJsonPath = path.join(symbolicLink, 'package.json');
            const extensionPackage = await readPkg(extensionJsonPath, { normalize: false });
            const rawExtensionPackage = require(extensionJsonPath);

            const dependencies: any = extensionPackage.dependencies;
            const devDependencies: any = extensionPackage.devDependencies;
            const updatedDependencies: any = {};
            const updatedDevDependencies: any = {};

            const keysDependencies = dependencies ? Object.keys(dependencies) : [];
            await Promise.all(keysDependencies.map(async key => {
                updatedDependencies[key] = this.updateDependency(key, dependencies[key]);
            }));

            rawExtensionPackage['dependencies'] = updatedDependencies;
            const keysDevDependencies = devDependencies ? Object.keys(devDependencies) : [];
            await Promise.all(keysDevDependencies.map(async key => {
                updatedDevDependencies[key] = this.updateDependency(key, devDependencies[key]);
            }));

            rawExtensionPackage['devDependencies'] = updatedDevDependencies;

            // write again the file
            if (rewrite) {
                const json = JSON.stringify(rawExtensionPackage, undefined, 2);
                await fs.writeFile(extensionJsonPath, json);
            }

        }));
    }

    /**
     * Update the given dependency by comparing with global dependencies or checking if it's a theia dependency.
     * @param dependencyKey the key of dependency
     * @param dependencyValue its original value
     */
    updateDependency(dependencyKey: string, dependencyValue: string) {

        // is it already defined as a Theia dev dependency ? if yes then return this value
        const rest = this.globalDevDependencies.get(dependencyKey);
        if (rest) {
            return rest;
        }

        // is it a theia dependency
        if (dependencyKey.startsWith('@theia/')) {
            // add carret and the current version
            return `^${this.theiaVersion}`;
        }
        // return default value
        return dependencyValue;
    }

    /**
     * Insert the given extension into the package.json of the assembly.
     * @param extension the given extension
     */
    async insertExtensionIntoAssembly(extension: ISource) {

        // first, read the assembly json file
        const assemblyPackageJsonPath = path.join(this.assemblyFolder, 'package.json');
        const assemblyJsonRawContent = require(assemblyPackageJsonPath);
        const dependencies = assemblyJsonRawContent.dependencies;
        extension.extSymbolicLinks.forEach(extensionSymLink => {

            // first resolve path
            const resolvedPath = path.resolve(extensionSymLink, 'package.json');

            // read extension name within symlink
            const extensionName = require(resolvedPath).name;
            const extensionVersion = require(resolvedPath).version;
            dependencies[extensionName] = extensionVersion;
        });
        const json = JSON.stringify(assemblyJsonRawContent, undefined, 2);
        await fs.writeFile(assemblyPackageJsonPath, json);
    }

    async symlink(source: ISource): Promise<void> {

        const symbolicLinks: string[] = [];

        // now, perform symlink for specific folder or current folder
        if (source.extensions) {
            // ok here we have several folders, need to iterate
            await Promise.all(source.extensions.map(async folder => {

                // source folder
                const sourceFolder = path.resolve(source.clonedDir, folder);
                const dest = path.resolve(this.packagesFolder, `${InitSources.PREFIX_PACKAGES_EXTENSIONS}${path.basename(sourceFolder)}`);
                Logger.info(`Creating symlink from ${sourceFolder} to ${dest}`);
                await fs.ensureSymlink(sourceFolder, dest);
                symbolicLinks.push(dest);
            }));
        } else {
            const dest = path.resolve(this.packagesFolder, `${InitSources.PREFIX_PACKAGES_EXTENSIONS}${path.basename(source.clonedDir)}`);
            Logger.info(`Creating symlink from ${source.clonedDir} to ${dest}`);
            await fs.ensureSymlink(source.clonedDir, dest);
            symbolicLinks.push(dest);
        }

        source.extSymbolicLinks = symbolicLinks;

    }

    async pluginsSymlink(source: ISource): Promise<void> {

        const symbolicLinks: string[] = [];

        // now, perform symlink for specific folder or current folder
        if (source.plugins) {
            // ok here we have several folders, need to iterate
            await Promise.all(source.plugins.map(async folder => {

                // source folder
                const sourceFolder = path.resolve(source.clonedDir, folder);
                const dest = path.resolve(this.pluginsFolder, `${path.basename(sourceFolder)}`);
                Logger.info(`Creating symlink from ${sourceFolder} to ${dest}`);
                await fs.ensureSymlink(sourceFolder, dest);
                symbolicLinks.push(dest);
            }));
        } else {
            const dest = path.resolve(this.pluginsFolder, `${path.basename(source.clonedDir)}`);
            Logger.info(`Creating symlink from ${source.clonedDir} to ${dest}`);
            await fs.ensureSymlink(source.clonedDir, dest);
            symbolicLinks.push(dest);
        }

        source.pluginSymbolicLinks = symbolicLinks;

    }

    /**
     * Clone the given extension with the correct branch/tag
     * @param extension the extension to clone
     */
    async clone(extension: ISource): Promise<void> {
        if (fs.existsSync(extension.source)) {
            Logger.info(`Skipping cloning sources for ${extension.source} already provided...`);
            extension.clonedDir = extension.source;
        } else {
            Logger.info(`Cloning ${extension.source}...`);
            const repository = new Repository(extension.source);
            extension.clonedDir = await repository.clone(this.cheTheiaFolder, repository.getRepositoryName(), extension.checkoutTo, this.keepHistory);
        }
    }

    async initSourceLocationAliases(alias: string[] | undefined) {
        if (alias) {
            alias.forEach(element => {
                if (element.indexOf('=')) {
                    const index = element.substring(0, element.indexOf('='));
                    const value = element.substring(element.indexOf('=') + 1, element.length);
                    this.sourceLocationAliases.set(index, value);
                }
            });
        }
    }

    async readConfigurationAndGenerate(configPath: string | undefined, dev: boolean): Promise<void> {
        let extensionsYamlPath: string;
        if (configPath) {
            extensionsYamlPath = path.resolve(configPath);
            if (!fs.existsSync(extensionsYamlPath)) {
                throw new CliError('Config file does not exists');
            }
        } else {
            Logger.debug("Config wasn't provided, downloading default...");
            const tmpFile = tmp.fileSync();
            const response = await axios.default.get(InitSources.DEFAULT_EXTENSIONS_URI);
            const data = response.data;
            fs.writeFileSync(tmpFile.name, data);
            extensionsYamlPath = tmpFile.name;
        }
        await this.generate(extensionsYamlPath, dev);
    }

}

/**
 * Source's interface
 */
export interface ISource {
    source: string,
    checkoutTo: string,
    type: string,
    extensions: string[],
    plugins: string[],
    clonedDir: string,
    extSymbolicLinks: string[],
    pluginSymbolicLinks: string[]
}
