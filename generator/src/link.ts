/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
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

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import { Command } from './command';
import { CommandBuilder } from 'yargs';

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
export async function handleCommand(args: any): Promise<void> {
    const theiaDir = args.theia || path.resolve(process.cwd(), '../theia');
    const cheTheiaDir = args['che-theia'] || process.cwd();

    const cfg = await new Command(cheTheiaDir).exec('yarn --silent --json --non-interactive config current');

    try {
        const yarnConfig = JSON.parse(JSON.parse(cfg).data);
        let linkDir = yarnConfig['linkFolder'] || path.resolve(os.homedir(), '.yarn/link');
        await fs.ensureDir(linkDir);
        linkDir = await fs.realpath(linkDir);
        await link(cheTheiaDir, theiaDir, linkDir);
    } catch (e) {
        console.error(e);
    }
}

export async function link(cheTheiaProjectPath: string, theiaProjectPath: string, yarnLinkFolder: string) {
    await linkTheia(yarnLinkFolder, theiaProjectPath);
    await linkChe(yarnLinkFolder, cheTheiaProjectPath);
}

async function linkTheia(yarnLinkFolder: string, theiaProjectPath: string) {
    for (const rootName of ['packages', 'dev-packages', 'examples']) {
        const rootPath = path.resolve(theiaProjectPath, rootName);
        const folderNames = await fs.readdir(rootPath);
        for (const folderName of folderNames) {
            await new Command(path.resolve(rootPath, folderName)).exec(`yarn link --link-folder=${yarnLinkFolder}`);
        }
    }
}

async function linkChe(yarnLinkFolder: string, cheTheiaProjectPath: string) {
    const packages = await fs.readdir(path.resolve(yarnLinkFolder, '@theia'));
    const cmd = new Command(cheTheiaProjectPath);
    for (const pkg of packages) {
        await cmd.exec(`yarn link @theia/${pkg}`);
    }
}
