/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
const { spawn } = require('child_process');

export interface GitUpstreamBranch {
    remote: string;
    branch: string;
    remoteURL?: string;
}

export async function getUpstreamBranch(projectPath: string): Promise<GitUpstreamBranch | undefined> {

    return new Promise<GitUpstreamBranch | undefined>((resolve, reject) => {
        const gitRevParseCmd = spawn('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], { cwd: projectPath });

        let output = '';
        gitRevParseCmd.stdout.on('data', (data: string) => {
            output += data.toString();
        });
        gitRevParseCmd.on('close', async (code: any) => {
            output = output.trim();
            const gitUpstreamBranch: GitUpstreamBranch | undefined = parseGitUpstreamBranch(output);
            if (gitUpstreamBranch) {
                gitUpstreamBranch.remoteURL = await getRemoteURL(gitUpstreamBranch.remote, projectPath);
            }

            resolve(gitUpstreamBranch);
        });
        gitRevParseCmd.on('error', (err: any) => { resolve(undefined); });
    });
}

export function getRemoteURL(remote: string, projectPath: string): Promise<string | undefined> {
    return new Promise<string | undefined>((resolve, reject) => {

        const gitConfigUrl = spawn('git', ['config', '--get', `remote.${remote}.url`], { cwd: projectPath });
        let result = '';
        gitConfigUrl.stdout.on('data', (data: string) => {
            result += data.toString();
        });
        gitConfigUrl.on('close', (code: any) => {
            result = result.trim();
            resolve(result);
        });
        gitConfigUrl.on('error', (err: any) => { reject(err); });
    });
}

export function parseGitUpstreamBranch(gitBranchvvOutput: string): GitUpstreamBranch | undefined {

    const branchOrRemote = '[^\\s^/]+';
    const regexp = new RegExp(
        `(${branchOrRemote})\\/(${branchOrRemote})`
    );

    const result: RegExpMatchArray | null = gitBranchvvOutput.match(regexp);

    if (!result) {
        return undefined;
    }

    return {
        remote: result[1], branch: result[2]
    };

}

export function getGitRootFolder(uri: string): string {
    return uri.substring(0, uri.lastIndexOf('.git/'));
}
