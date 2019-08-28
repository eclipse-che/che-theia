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
import * as path from 'path';
import * as mustache from 'mustache';
import * as readPkg from 'read-pkg';
import { Command } from './command';
import { Logger } from './logger';

/**
 * Generates the examples/assembly
 * @author Florent Benoit
 */
export class Init {
    public static readonly GET_PACKAGE_WITH_VERSION_CMD = 'yarn --json --non-interactive --no-progress list --pattern=';
    public static readonly MONACO_CORE_PKG = '@typefox/monaco-editor-core';
    public static readonly MONACO_HTML_CONTRIB_PKG = 'monaco-html';
    public static readonly MONACO_CSS_CONTRIB_PKG = 'monaco-css';

    constructor(readonly rootFolder: string, readonly examplesAssemblyFolder: string, readonly checkoutFolder: string, readonly pluginsFolder: string) {

    }

    async getCurrentVersion(): Promise<string> {
        return (await readPkg(path.join(this.rootFolder, 'packages/core/package.json'))).version;
    }

    async getPackageWithVersion(name: string): Promise<String> {
        const pkg = JSON.parse(await new Command(path.resolve(this.rootFolder)).exec(Init.GET_PACKAGE_WITH_VERSION_CMD + name)).data.trees[0];
        return pkg ? pkg.name : '';
    }

    async generate(): Promise<void> {
        const srcDir = path.resolve(__dirname, '../src');
        const distDir = path.resolve(__dirname, '../dist');
        const templateDir = path.join(srcDir, 'templates');
        const packageJsonContent = await fs.readFile(path.join(templateDir, 'assembly-package.mst'));

        // generate assembly if does not exists
        const rendered = await this.generateAssemblyPackage(packageJsonContent.toString());
        await fs.ensureDir(this.examplesAssemblyFolder);
        await fs.writeFile(path.join(this.examplesAssemblyFolder, 'package.json'), rendered);
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
            monacohtmlcontribpkg: await this.getPackageWithVersion(Init.MONACO_HTML_CONTRIB_PKG),
            monacocsscontribpkg: await this.getPackageWithVersion(Init.MONACO_CSS_CONTRIB_PKG)
        };
        return mustache.render(template, tags).replace(/&#x2F;/g, '/');
    }

}
