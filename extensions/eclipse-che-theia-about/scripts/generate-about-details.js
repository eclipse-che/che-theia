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

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// grab sha1 of theia
async function getTheiaGitSha1() {
    // checks if given directory is Theia directory
    async function checkIfTheiaDir(directoryPath) {
        const packagesDir = path.resolve(directoryPath, 'packages');
        const dotTheiaDir = path.resolve(directoryPath, '.theia');
        const gitDir = path.resolve(directoryPath, '.git');
        const inTheiaDir = await fs.pathExists(packagesDir) && await fs.pathExists(dotTheiaDir) && await fs.pathExists(gitDir);
        return inTheiaDir;
    }

    // returns short (first 7 symbols) version of HEAD commit hash
    async function getLastCommitHash(theiaDirParam) {
        // run git command in theia directory
        const { stdout, stderr } = await exec('git rev-parse --short HEAD', {
            cwd: theiaDirParam
        });
        if (stderr) {
            throw new Error(`Unable to get current SHA-1: ${stderr}`);
        }
        return stdout.trim();
    }

    // suppose Che Theia is located inside theia folder in 'che/che-theia'
    let theiaDir = path.resolve(__dirname, '../../../../..');
    if (await checkIfTheiaDir(theiaDir)) {
        return await getLastCommitHash(theiaDir);
    }

    // try to look at ~/theia-source-code which is used during docker image build
    theiaDir = path.resolve(os.homedir(), 'theia-source-code');
    if (await checkIfTheiaDir(theiaDir)) {
        return await getLastCommitHash(theiaDir);
    }

    // still not found theia context, give up
    return ('N/A');
}

/**
 * Grab sha1 of Che Theia
 */
async function getCheTheiaGitSha1() {

    const { stdout, stderr } = await exec('git rev-parse --short HEAD');
    if (stderr) {
        throw new Error(`Unable to get current SHA-1: ${stderr}`);
    }

    // try to look at ~/theia-source-code/che-theia/.git-che-theia-sha1 if docker build
    const sha1InsideCheTheia = path.resolve(os.homedir(), 'theia-source-code', 'che-theia', '.git-che-theia-sha1');
    if (await fs.pathExists(sha1InsideCheTheia)) {
        return (await fs.readFile(sha1InsideCheTheia, 'utf8')).trim();
    }

    return stdout.trim();
}

(async () => {
    const theiaSha1 = await getTheiaGitSha1();
    const cheTheiaSha1 = await getCheTheiaGitSha1();

    // grab current time for build time
    const date = new Date(Date.now()).toLocaleString();
    const rootDir = path.resolve(__dirname, '..');
    const confDir = path.resolve(rootDir, 'conf');
    const confFile = path.resolve(confDir, 'about-details.json');

    // write the file
    await fs.ensureDir(confDir);
    await fs.writeFile(confFile, JSON.stringify({ date, theiaSha1, cheTheiaSha1 }, null, 2));
    console.log(`Writing build details to ${confFile}`);

})().catch(e => {
    console.error('Error when running script', e);
});
