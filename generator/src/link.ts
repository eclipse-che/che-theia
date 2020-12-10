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
 * A command to yarn link theia dependencies into che-theia
 * @author Thomas Mäder
 */

import * as fsextra from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import { Command } from './command';
import { CommandBuilder } from 'yargs';
import { Logger } from './logger';

export const builder: CommandBuilder = {
    theia: {
        describe: 'Path of the theia project source',
        requiresArg: true,
        type: 'string',
        demandOption: false,
    },
    'che-theia': {
        describe: 'Path of the che-theia project source',
        requiresArg: true,
        type: 'string',
        demandOption: false,
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleCommand(args: any) {
    const theiaDir = args.theia || path.resolve(process.cwd(), '../theia');
    const cheTheiaDir = args['che-theia '] || process.cwd();

    const yarnConfig = JSON.parse(
        await new Command(cheTheiaDir).exec('yarn --silent --non-interactive config current')
    );
    const linkDir = yarnConfig['linkFolder'] || path.resolve(os.homedir(), '.yarn/link');

    link(cheTheiaDir, theiaDir, linkDir);
}

export async function link(cheTheiaProjectPath: string, theiaProjectPath: string, yarnLinkFolder: string) {
    await linkTheia(theiaProjectPath);
    await linkChe(yarnLinkFolder, cheTheiaProjectPath);
}

async function linkTheia(theiaProjectPath: string) {
    for (const rootName of ['packages', 'dev-packages', 'examples']) {
        const rootPath = path.resolve(theiaProjectPath, rootName);
        const folderNames = await fsextra.readdir(rootPath);
        for (const folderName of folderNames) {
            Logger.info(await new Command(path.resolve(rootPath, folderName)).exec('yarn link'));
        }
    }
}

async function linkChe(yarnLinkFolder: string, cheTheiaProjectPath: string) {
    const packages = await fsextra.readdir(path.resolve(yarnLinkFolder, '@theia'));
    const cmd = new Command(cheTheiaProjectPath);
    for (const pkg of packages) {
        Logger.info(await cmd.exec(`yarn link @theia/${pkg}`));
    }
}
