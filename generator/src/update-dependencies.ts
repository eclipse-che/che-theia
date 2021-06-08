/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/**
 * Simple code to rewrite versions of a dependency in package.json files
 * @author Thomas Mäder
 */

import * as glob from 'glob';
import * as path from 'path';

import { CommandBuilder } from 'yargs';
import { promisify } from 'util';
import { rewriteJson } from './json-utils';

export const builder: CommandBuilder = {
    'theia-version': {
        describe: 'The version of Theia to uses in che-theia',
        requiresArg: true,
        type: 'string',
        demandOption: true,
    },
    'che-theia': {
        describe: 'Path of the che-theia project source',
        requiresArg: true,
        type: 'string',
        demandOption: false,
    },
};

const EXCLUSIONS = ['@theia/plugin-packager'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleCommand(args: any) {
    const cheTheiaDir = args['che-theia '] || process.cwd();
    const theiaVersion = args['theia-version'];

    const packageJsons = await promisify(glob)(cheTheiaDir + '/extensions/*/package.json');
    packageJsons.push(...(await promisify(glob)(cheTheiaDir + '/plugins/*/package.json')));
    packageJsons.push(path.resolve(cheTheiaDir, 'generator/package.json'));
    packageJsons.push(path.resolve(cheTheiaDir, 'assembly/package.json'));
    packageJsons.push(path.resolve(cheTheiaDir, 'package.json'));

    for (const packageJson of packageJsons) {
        await updateDependencies(packageJson, packageName => {
            if (packageName.startsWith('@theia') && !EXCLUSIONS.includes(packageName)) {
                return theiaVersion;
            }
        });
    }
}

async function updateDependencies(
    packageJSONPath: string,
    replaceVersion: (packageName: string) => string | undefined
) {
    try {
        await rewriteJson(packageJSONPath, pkgJson => {
            // we're assuming the package.json is well formed
            replaceInSection(pkgJson.dependencies, replaceVersion);
            replaceInSection(pkgJson.devDependencies, replaceVersion);
        });
    } catch (e) {
        console.warn('could not find package json: ' + packageJSONPath);
        return;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function replaceInSection(section: any, replaceVersion: (packageName: string) => string | undefined) {
    if (section) {
        for (const dep in section) {
            if (section.hasOwnProperty(dep)) {
                const replacement = replaceVersion(dep);
                if (replacement) {
                    section[dep] = replacement;
                }
            }
        }
    }
}
