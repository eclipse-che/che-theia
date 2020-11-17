/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as path from 'path';
import * as yargs from 'yargs';

import { Cdn } from './cdn';
import { Clean } from './clean';
import { CliError } from './cli-error';
import { Init } from './init';
import { InitSources } from './init-sources';
import { Logger } from './logger';
import { Production } from './production';

const ASSSEMBLY_PATH = 'examples/assembly';

/**
 * Entry point of this helper script
 * @author Florent Benoit
 */
const commandArgs = yargs
    .usage('$0 <cmd> [args]')
    .command({
        command: 'init',
        describe: 'Initialize current theia to beahve like a Che/Theia',
        builder: InitSources.argBuilder,
        handler: async args => {
            try {
                const assemblyFolder = path.resolve(process.cwd(), ASSSEMBLY_PATH);
                const packagesFolder = path.resolve(process.cwd(), 'packages');
                const pluginsFolder = path.resolve(process.cwd(), 'plugins');
                const cheFolder = path.resolve(process.cwd(), 'che');
                const init = new Init(process.cwd(), assemblyFolder, cheFolder, pluginsFolder);
                const version = await init.getCurrentVersion();
                await init.generate();
                await init.updatePluginsConfigurtion();
                const initSources = new InitSources(
                    process.cwd(),
                    packagesFolder,
                    pluginsFolder,
                    cheFolder,
                    assemblyFolder,
                    version
                );
                await initSources.initSourceLocationAliases(args.alias);
                await initSources.readConfigurationAndGenerate(args.config, args.dev);
                await init.updadeBuildConfiguration(initSources.extensions);
            } catch (err) {
                handleError(err);
            }
        },
    })
    .command({
        command: 'production',
        describe: 'Copy Theia to a production directory',
        handler: async () => {
            try {
                const assemblyFolder = path.resolve(process.cwd(), ASSSEMBLY_PATH);
                const production = new Production(process.cwd(), assemblyFolder, 'production');
                await production.create();
            } catch (err) {
                handleError(err);
            }
        },
    })
    .command({
        command: 'cdn',
        describe: 'Add or update the CDN support configuration',
        builder: Cdn.argBuilder,
        handler: async argv => {
            try {
                const assemblyFolder = path.resolve(process.cwd(), ASSSEMBLY_PATH);
                const cdn = new Cdn(assemblyFolder, argv.theia, argv.monaco);
                await cdn.create();
            } catch (err) {
                handleError(err);
            }
        },
    })
    .command({
        command: 'clean',
        describe: 'Clean Theia repository',
        handler: async () => {
            try {
                const assemblyFolder = path.resolve(process.cwd(), ASSSEMBLY_PATH);
                const packagesFolder = path.resolve(process.cwd(), 'packages');
                const pluginsFolder = path.resolve(process.cwd(), 'plugins');
                const cheFolder = path.resolve(process.cwd(), 'che');
                const nodeModules = path.resolve(process.cwd(), 'node_modules');
                const clean = new Clean(assemblyFolder, cheFolder, packagesFolder, pluginsFolder, nodeModules);
                clean.cleanCheTheia();
            } catch (err) {
                handleError(err);
            }
        },
    })
    .help()
    .strict()
    .demandCommand().argv;

if (!commandArgs) {
    yargs.showHelp();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(error: any): void {
    if (error instanceof CliError) {
        Logger.error('=> 🚒 ' + error.message);
    } else {
        Logger.error(error);
    }
    process.exit(1);
}
