/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';

import { Workspace, WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import { DefaultWorkspaceServer } from '@theia/workspace/lib/node/default-workspace-server';
import { FileUri } from '@theia/core/lib/node';

interface TheiaWorkspace {
  folders: TheiaWorkspacePath[];
}

interface TheiaWorkspacePath {
  path: string;
}

@injectable()
export class CheWorkspaceServer extends DefaultWorkspaceServer {
  @inject(WorkspaceService)
  protected workspaceService: WorkspaceService;

  // override any workspace that could have been defined through CLI and use entries from the devfile
  // if not possible, use default method
  protected async getRoot(): Promise<string | undefined> {
    const workspace = await this.workspaceService.currentWorkspace();
    if (!isMultiRoot(workspace)) {
      return super.getRoot();
    }

    const projectsRootEnvVariable = process.env.CHE_PROJECTS_ROOT;
    const projectsRoot = projectsRootEnvVariable ? projectsRootEnvVariable : '/projects';

    // first, check if we have a che.theia-workspace file
    const cheTheiaWorkspaceFile = path.resolve(projectsRoot, 'che.theia-workspace');
    const cheTheiaWorkspaceFileUri = FileUri.create(cheTheiaWorkspaceFile);
    const exists = await fs.pathExists(cheTheiaWorkspaceFile);
    if (!exists) {
      // no, then create the file
      const theiaWorkspace: TheiaWorkspace = { folders: [] };
      await fs.writeFile(cheTheiaWorkspaceFile, JSON.stringify(theiaWorkspace), { encoding: 'utf8' });
    }

    return cheTheiaWorkspaceFileUri.toString();
  }
}

function isMultiRoot(workspace: Workspace): boolean {
  const devfile = workspace.devfile;
  return !!devfile && !!devfile.attributes && !!devfile.attributes.multiRoot && devfile.attributes.multiRoot === 'on';
}
