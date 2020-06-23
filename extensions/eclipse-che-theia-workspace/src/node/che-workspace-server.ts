/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { injectable, inject } from 'inversify';
import { DefaultWorkspaceServer } from '@theia/workspace/lib/node/default-workspace-server';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { FileUri } from '@theia/core/lib/node';
import * as fs from 'fs-extra';
import * as path from 'path';

interface TheiaWorkspace {
    folders: TheiaWorkspacePath[]
};

interface TheiaWorkspacePath {
    path: string
};

@injectable()
export class CheWorkspaceServer extends DefaultWorkspaceServer {

    @inject(CheApiService)
    private cheApiService: CheApiService;

    // override any workspace that could have been defined through CLI and use entries from the devfile
    // if not possible, use default method
    protected async getRoot(): Promise<string | undefined> {

        let projectsRoot: string;
        if (process.env.CHE_PROJECTS_ROOT) {
            projectsRoot = process.env.CHE_PROJECTS_ROOT;
        } else {
            projectsRoot = '/projects';
        }

        // first, check if we have a che.theia-workspace file
        const cheTheiaWorkspaceFile = path.resolve(projectsRoot, 'che.theia-workspace');
        const exists = await fs.pathExists(cheTheiaWorkspaceFile);
        if (exists) {
            return FileUri.create(cheTheiaWorkspaceFile).toString();
        }

        // no, then create the file

        const workspace = await this.cheApiService.currentWorkspace();
        const devfile = workspace.devfile;
        if (devfile) {
            const projects = devfile.projects;
            if (projects) {
                // create a struc for each project
                const theiaWorkspace: TheiaWorkspace = { folders: [] };
                for (const project of projects) {
                    const projectPath = project.clonePath ? path.join(projectsRoot, project.clonePath) : path.join(projectsRoot, project.name!);
                    // check parent folder exists
                    const parentDir = path.resolve(projectPath, '..');
                    await fs.ensureDir(parentDir);
                    theiaWorkspace.folders.push({ path: FileUri.create(projectPath).toString() });
                }

                // now, need to write the content of this file
                await fs.writeFile(cheTheiaWorkspaceFile, JSON.stringify(theiaWorkspace), { encoding: 'utf8' });

                // return this content
                return FileUri.create(cheTheiaWorkspaceFile).toString();
            }
        }

        return super.getRoot();
    }

}
