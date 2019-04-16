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
const fs = require('fs-extra');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// grab sha1 of theia
async function getTheiaGitSha1() {
    // check if there is a theia directory
    const theiaDir = path.resolve(__dirname, '../../../../..');
    const packagesDir = path.resolve(theiaDir, 'packages');
    const dotTheiaDir = path.resolve(theiaDir, '.theia');
    const inTheia = await fs.pathExists(packagesDir) && await fs.pathExists(dotTheiaDir);

    // not in a theia context, N/A
    if (!inTheia) {
        return ('N/A');
    }

    // run git command in theia directory
    const { stdout, stderr } = await exec('git rev-parse --short HEAD', {
        cwd: theiaDir
    });
    if (stderr) {
        throw new Error(`Unable to get current SHA-1: ${stderr}`);
    }
    return stdout.trim();
}

/**
 * Grab sha1 of che
 */
async function getCheGitSha1() {

    const { stdout, stderr } = await exec('git rev-parse --short HEAD');
    if (stderr) {
        throw new Error(`Unable to get current SHA-1: ${stderr}`);
    }
    return stdout.trim();
}

(async () => {
    const theiaSha1 = await getTheiaGitSha1();
    const cheSha1 = await getCheGitSha1();

    // grab current time for build time
    const date = new Date(Date.now()).toLocaleString();
    const rootDir = path.resolve(__dirname, '..');
    const confDir = path.resolve(rootDir, 'conf');
    const confFile = path.resolve(confDir, 'about-details.json');

    // write the file
    await fs.ensureDir(confDir);
    await fs.writeFile(confFile, JSON.stringify({ date, theiaSha1, cheSha1 }, null, 2));
    console.log(`Writing build details to ${confFile}`);

})().catch(e => {
    console.error('Error when running script', e);
});
