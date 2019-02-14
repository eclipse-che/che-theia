#!/usr/bin/env node
/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

const path = require('path');
const cp = require('child_process');

const cheScriptsPck = require(path.resolve(__dirname, 'package.json'));

function run(script: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const env = Object.assign({}, process.env);
        const scriptProcess = cp.exec(script, {
            env,
            cwd: process.cwd()
        });
        scriptProcess.stdout.pipe(process.stdout);
        scriptProcess.stderr.pipe(process.stderr);
        scriptProcess.on('error', reject);
        scriptProcess.on('close', resolve);
    });
}

function getCheScript(): string {
    const commandIndex = process.argv.findIndex(arg => arg.endsWith('che-theia')) + 1;
    const args = process.argv.slice(commandIndex);
    if (!args[0]) {
        throw new Error('Please specify the script that runs with che-theia command.');
    }
    const script = 'che:' + args[0];
    if (!(script in cheScriptsPck.scripts)) {
        throw new Error('The che script does not exist: ' + script);
    }
    return [cheScriptsPck.scripts[script], ...args.slice(1, args.length)].join(' ');
}

(async () => {
    let exitCode = 0;
    let cheScript = undefined;
    try {
        cheScript = getCheScript();
        exitCode = await run(cheScript);
    } catch (err) {
        if (cheScript) {
            console.error(`Error occurred in che-theia when executing: '${cheScript}'`, err);
        } else {
            console.error('Error occurred in che-theia', err);
        }
        console.log(`${err.name}: ${err.message}`);
        exitCode = 1;
    }
    process.exit(exitCode);
})();
