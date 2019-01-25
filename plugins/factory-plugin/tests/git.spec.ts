/*
 * Copyright (c) 2019 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import * as git from "../src/git"
const rimraf = require("rimraf");
const { spawn } = require('child_process');

jest.setTimeout(20000);

describe("Test git commands", () => {

    beforeAll(async () => {
        await removeFolder('/tmp/che-theia-samples');
        await gitClone('/tmp/', 'https://github.com/eclipse/che-theia-samples');
    });


    test("parse results of  git rev-parse --abbrev-ref --symbolic-full-name @{upstream}", async () => {
        const output = "origin/master"
        const gitBranch: git.GitUpstreamBranch | undefined = git.parseGitUpstreamBranch(output);
        expect(gitBranch).toBeDefined();
        expect(gitBranch.remote).toBe('origin');
        expect(gitBranch.branch).toBe('master');
    });


    test("get git current branch", async () => {
        const currentBranch = await git.getUpstreamBranch('/tmp/che-theia-samples');
        expect(currentBranch.branch).toBe('master');
        expect(currentBranch.remoteURL).toBe('https://github.com/eclipse/che-theia-samples');
    });

    test("get git current branch after checkout", async () => {
        await gitCheckout('/tmp/che-theia-samples', 'hello-world-plugins');
        expect((await git.getUpstreamBranch('/tmp/che-theia-samples'))).toBeUndefined;
    });

    test("Get git root folder from git config or index file", async () => {
        expect(git.getGitRootFolder('/tmp/che-theia-samples/.git/config')).toBe('/tmp/che-theia-samples/');
        expect(git.getGitRootFolder('/tmp/che-theia-samples/.git/HEAD')).toBe('/tmp/che-theia-samples/');
    });

    afterAll(async () => {
        await removeFolder('/tmp/che-theia-samples');
    });
});


async function removeFolder(folderPath: string): Promise<undefined> {
    return new Promise<undefined>((resolve, reject) => {
        rimraf(folderPath, () => { resolve() });
    });
}

async function gitCheckout(projectPath: string, branch: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const gitCheckoutCmd = spawn('git', ['checkout', '-b', branch], { cwd: projectPath });

        let result = '';
        gitCheckoutCmd.stdout.on('data', (data: string) => {
            result += data.toString();
        });
        gitCheckoutCmd.on('close', (code: any) => {
            resolve(result);
        });
        gitCheckoutCmd.on('error', (err: any) => { reject(err); });
    });
}

async function gitClone(targetFolderPath: string, gitRepo: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const gitClone = spawn('git', ['clone', gitRepo], { cwd: targetFolderPath });

        let result = '';
        gitClone.stdout.on('data', (data: string) => {
            result += data.toString();
        });
        gitClone.on('close', (code: any) => {
            resolve(result);
        });
        gitClone.on('error', (err: any) => { reject(err); });
    });
}
