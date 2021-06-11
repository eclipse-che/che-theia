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
import { rewriteJson } from './json-utils';

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

    const assemblyDir = path.resolve(cheTheiaDir, 'assembly');
    await generateAssembly(assemblyDir, {
        theiaVersion,
        monacoVersion,
        configDirPrefix: '../../',
        packageRefPrefix: '../extensions/',
    });

    const extensionsDir = path.resolve(cheTheiaDir, 'extensions');
    const folderNames = await fs.readdir(extensionsDir);
    const extensions = new Map<string, string>();
    for (const folderName of folderNames) {
        const pkgJson = require(path.resolve(extensionsDir, folderName, 'package.json'));
        extensions.set(pkgJson.name, pkgJson.version);
    }

    const theiaPlugins = await fs.readJson(path.resolve(__dirname, '../src/templates/theiaPlugins.json'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rewriteJson(path.resolve(assemblyDir, 'package.json'), (json: any) => {
        const deps = json.dependencies || {};
        extensions.forEach((version: string, name: string) => {
            deps[name] = version;
        });
        json.dependencies = deps;
        json.scripts['download:plugins'] = 'theia download:plugins';
        json.scripts.prepare = json.scripts.prepare + ' && yarn download:plugins';
        json.theiaPluginsDir = '../plugins';
        json.theiaPlugins = theiaPlugins;
    });
}

export interface AssemblyConfiguration {
    theiaVersion: string;
    monacoVersion: string;
    configDirPrefix: string;
    packageRefPrefix: string;
}

export async function generateAssembly(examplesAssemblyFolder: string, config: AssemblyConfiguration): Promise<void> {
    const srcDir = path.resolve(__dirname, '../src');
    const distDir = path.resolve(__dirname, '../dist');
    const templateDir = path.join(srcDir, 'templates');
    const compileTsConfig = path.join(templateDir, 'assembly-compile.tsconfig.mst.json');

    // generate assembly if does not exists
    await fs.ensureDir(examplesAssemblyFolder);

    const template = path.join(templateDir, 'assembly-package.mst.json');
    const target = path.join(examplesAssemblyFolder, 'package.json');

    await renderTemplate(template, target, config);
    await renderTemplate(compileTsConfig, path.join(examplesAssemblyFolder, 'compile.tsconfig.mst.json'), config);

    Logger.info(`copying ${path.join(templateDir, 'cdn')} to ${path.join(examplesAssemblyFolder, 'cdn')}`);
    await fs.copy(path.join(templateDir, 'cdn'), path.join(examplesAssemblyFolder, 'cdn'));
    Logger.info('distdir=' + distDir);
    await fs.copy(path.join(distDir, 'cdn'), path.join(examplesAssemblyFolder, 'cdn'));
    await fs.copy(path.join(srcDir, 'scripts'), path.join(examplesAssemblyFolder, 'scripts'));
}

async function renderTemplate(template: string, target: string, config: Object): Promise<void> {
    const content = await fs.readFile(template);
    const rendered = mustache.render(content.toString(), config).replace(/&#x2F;/g, '/');
    await fs.writeFile(target, rendered);
}
