/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { execute } from './exec';

export interface GitUpstreamBranch {
    remote: string;
    branch: string;
    remoteURL?: string;
}

export async function getUpstreamBranch(projectPath: string): Promise<GitUpstreamBranch | undefined> {
    const remoteBranchRef = await execGit(projectPath, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}');
    if (!remoteBranchRef) {
        return;
    }
    const gitUpstreamBranch = parseGitUpstreamBranch(remoteBranchRef);
    if (gitUpstreamBranch) {
        gitUpstreamBranch.remoteURL = await getRemoteURL(gitUpstreamBranch.remote, projectPath);
    }
    return gitUpstreamBranch;
}

export function getRemoteURL(remote: string, projectPath: string): Promise<string | undefined> {
    return execGit(projectPath, 'config', '--get', `remote.${remote}.url`);
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

export async function execGit(directory: string, ...args: string[]): Promise<string | undefined> {
    return execute('git', args, { cwd: directory }).catch(() => undefined);
}
