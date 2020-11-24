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
import * as mustache from 'mustache';
import * as path from 'path';
import * as readPkg from 'read-pkg';

import { Command } from './command';
import { ISource } from './init-sources';
import { Logger } from './logger';

/**
 * Generates the examples/assembly
 * @author Florent Benoit
 */
export class Init {
    public static readonly GET_PACKAGE_WITH_VERSION_CMD = 'yarn --json --non-interactive --no-progress list --pattern=';
    public static readonly MONACO_CORE_PKG = '@theia/monaco-editor-core';

    constructor(
        readonly rootFolder: string,
        readonly examplesAssemblyFolder: string,
        readonly checkoutFolder: string,
        readonly pluginsFolder: string
    ) {}

    async getCurrentVersion(): Promise<string> {
        return (await readPkg(path.join(this.rootFolder, 'packages/core/package.json'))).version;
    }

    async getPackageWithVersion(name: string): Promise<string> {
        const pkg = JSON.parse(
            await new Command(path.resolve(this.rootFolder)).exec(Init.GET_PACKAGE_WITH_VERSION_CMD + name)
        ).data.trees[0];
        return pkg ? pkg.name : '';
    }

    async generate(): Promise<void> {
        const srcDir = path.resolve(__dirname, '../src');
        const distDir = path.resolve(__dirname, '../dist');
        const templateDir = path.join(srcDir, 'templates');
        const compileTsConfig = path.join(templateDir, 'assembly-compile.tsconfig.json');
        const packageJsonContent = await fs.readFile(path.join(templateDir, 'assembly-package.mst'));

        // generate assembly if does not exists
        const rendered = await this.generateAssemblyPackage(packageJsonContent.toString());
        await fs.ensureDir(this.examplesAssemblyFolder);
        await fs.writeFile(path.join(this.examplesAssemblyFolder, 'package.json'), rendered);
        await fs.copy(compileTsConfig, path.join(this.examplesAssemblyFolder, 'compile.tsconfig.json'));
        await fs.copy(path.join(templateDir, 'cdn'), path.join(this.examplesAssemblyFolder, 'cdn'));
        Logger.info(distDir);
        await fs.copy(path.join(distDir, 'cdn'), path.join(this.examplesAssemblyFolder, 'cdn'));
        await fs.copy(path.join(srcDir, 'scripts'), path.join(this.examplesAssemblyFolder, 'scripts'));

        // Generate checkout folder is does not exist
        await fs.ensureDir(this.checkoutFolder);

        // copy build all plugins scripts
        await fs.ensureDir(this.pluginsFolder);
        await fs.copy(path.join(srcDir, 'foreach_yarn'), path.join(this.pluginsFolder, 'foreach_yarn'));
    }

    async generateAssemblyPackage(template: string): Promise<string> {
        const tags = {
            version: await this.getCurrentVersion(),
            monacopkg: await this.getPackageWithVersion(Init.MONACO_CORE_PKG),
        };
        return mustache.render(template, tags).replace(/&#x2F;/g, '/');
    }

    async updadeBuildConfiguration(extensions: ISource[]): Promise<void> {
        const theiaPackagePath = path.join(this.rootFolder, 'package.json');
        const theiaPackage = await readPkg(theiaPackagePath);
        const scriptsConfiguration = theiaPackage.scripts;

        if (scriptsConfiguration && scriptsConfiguration['prepare:build']) {
            scriptsConfiguration['prepare:build'] = 'yarn build && run lint && lerna run build';
        }

        const theiaDevDependencies = theiaPackage.devDependencies || {};
        const prettierConfiguration = theiaPackage.prettier || {};
        const importSortConfiguration = theiaPackage.importSort || {};
        const appendDevDependencies: Map<string, string> = new Map();
        // add prettier and linters used by extensions
        await Promise.all(
            extensions.map(async extension => {
                const extensionPackagePath = path.join(extension.clonedDir, 'package.json');
                const exists = await fs.pathExists(extensionPackagePath);
                if (exists) {
                    const extensionPackage = await readPkg(extensionPackagePath);
                    if (extensionPackage.prettier) {
                        Object.keys(extensionPackage.prettier).forEach(key => {
                            prettierConfiguration[key] = extensionPackage.prettier[key];
                        });
                    }
                    if (extensionPackage.importSort) {
                        Object.keys(extensionPackage.importSort).forEach(key => {
                            importSortConfiguration[key] = extensionPackage.importSort[key];
                        });
                    }
                    if (extensionPackage.devDependencies) {
                        // not existing in theia and match prettier or eslint
                        const keys = Object.keys(extensionPackage.devDependencies).filter(
                            key => !theiaDevDependencies[key] && (key.includes('prettier') || key.includes('eslint'))
                        );
                        keys.forEach(key => appendDevDependencies.set(key, extensionPackage.devDependencies![key]));
                    }
                }
            })
        );
        // grab all prettier, eslint stuff
        theiaPackage.prettier = prettierConfiguration;
        theiaPackage.importSort = importSortConfiguration;
        appendDevDependencies.forEach((value, key) => (theiaDevDependencies[key] = value));
        const json = JSON.stringify(theiaPackage, undefined, 2);
        await fs.writeFile(theiaPackagePath, json);
    }

    async updatePluginsConfigurtion(): Promise<void> {
        const theiaPackagePath = path.join(this.rootFolder, 'package.json');
        const theiaPackage = await readPkg(theiaPackagePath);

        theiaPackage['theiaPlugins'] = await this.getPluginsList();

        const json = JSON.stringify(theiaPackage, undefined, 2);
        await fs.writeFile(theiaPackagePath, json);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async getPluginsList(): Promise<any> {
        const srcDir = path.resolve(__dirname, '../src');
        const templateDir = path.join(srcDir, 'templates');
        const pluginsJsonContent = await fs.readFile(path.join(templateDir, 'theiaPlugins.json'));
        return JSON.parse(pluginsJsonContent.toString());
    }
}
