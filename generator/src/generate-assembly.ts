/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
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

import { CommandBuilder } from 'yargs';
import { Init } from './init';
import { Logger } from './logger';
import { getFullPackageName } from './yarn';

export const builder: CommandBuilder = {
    'che-theia': {
        describe: 'Path of the che-theia project source',
        requiresArg: true,
        type: 'string',
        demandOption: false,
    },
    'theia-version': {
        describe: 'Theia version to set',
        requiresArg: true,
        type: 'string',
        demandOption: false,
        default: 'next',
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleCommand(args: any) {
    const cheTheiaDir = args['che-theia '] || process.cwd();
    const theiaVersion = args['theia-version']!;
    const monacoVersion = await getFullPackageName(cheTheiaDir, Init.MONACO_CORE_PKG);

    if (!monacoVersion) {
        throw new Error(`Package not found: ${Init.MONACO_CORE_PKG}`);
    }

    generateAssembly(
        path.resolve(cheTheiaDir, 'assembly'),
        'assembly-package-new.mst.json',
        'assembly-compile-new.tsconfig.json',
        theiaVersion,
        monacoVersion
    );
}

export async function generateAssembly(
    examplesAssemblyFolder: string,
    templateName: string,
    compileConfigName: string,
    theiaVersion: string,
    monacoVersion: string
): Promise<void> {
    const srcDir = path.resolve(__dirname, '../src');
    const distDir = path.resolve(__dirname, '../dist');
    const templateDir = path.join(srcDir, 'templates');
    const compileTsConfig = path.join(templateDir, compileConfigName);
    const packageJsonContent = await fs.readFile(path.join(templateDir, templateName));

    // generate assembly if does not exists
    const view = {
        version: theiaVersion,
        monacopkg: monacoVersion,
    };

    const rendered = await generateAssemblyPackage(packageJsonContent.toString(), view);
    await fs.ensureDir(examplesAssemblyFolder);
    await fs.writeFile(path.join(examplesAssemblyFolder, 'package.json'), rendered);
    await fs.copy(compileTsConfig, path.join(examplesAssemblyFolder, 'compile.tsconfig.json'));
    Logger.info(`copying ${path.join(templateDir, 'cdn')} to ${path.join(examplesAssemblyFolder, 'cdn')}`);
    await fs.copy(path.join(templateDir, 'cdn'), path.join(examplesAssemblyFolder, 'cdn'));
    Logger.info('distdir=' + distDir);
    await fs.copy(path.join(distDir, 'cdn'), path.join(examplesAssemblyFolder, 'cdn'));
    await fs.copy(path.join(srcDir, 'scripts'), path.join(examplesAssemblyFolder, 'scripts'));
}

async function generateAssemblyPackage(template: string, view: Object): Promise<string> {
    return mustache.render(template, view).replace(/&#x2F;/g, '/');
}
