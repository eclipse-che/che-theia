/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';
export class WorkspaceFolderUpdater {
  private pendingFolders: string[] = [];
  private addingWorkspaceFolderPromise: Promise<void> | undefined;

  constructor(protected readonly updateWorkspaceFolderTimeout = 3000) {}

  async addWorkspaceFolder(path: string): Promise<void> {
    const workspaceFolderPath = this.toValidWorkspaceFolderPath(path);
    if (this.pendingFolders.includes(workspaceFolderPath)) {
      return;
    }

    if (this.addingWorkspaceFolderPromise) {
      this.pendingFolders.push(workspaceFolderPath);
      return;
    }

    try {
      this.addingWorkspaceFolderPromise = this.addFolder(workspaceFolderPath);
      await this.addingWorkspaceFolderPromise;
    } catch (error) {
      console.error(error);
    } finally {
      this.addingWorkspaceFolderPromise = undefined;

      const next = this.pendingFolders.shift();
      if (next) {
        return this.addWorkspaceFolder(next);
      }
    }
  }

  protected addFolder(projectPath: string): Promise<void> {
    const isProjectFolder = (folder: theia.WorkspaceFolder) => folder.uri.path === projectPath;
    const workspaceFolders: theia.WorkspaceFolder[] = theia.workspace.workspaceFolders || [];
    if (workspaceFolders.some(isProjectFolder)) {
      return Promise.resolve(undefined);
    }

    return new Promise<void>((resolve, reject) => {
      const disposable = theia.workspace.onDidChangeWorkspaceFolders(event => {
        const existingWorkspaceFolders = theia.workspace.workspaceFolders || [];
        if (event.added.some(isProjectFolder) || existingWorkspaceFolders.some(isProjectFolder)) {
          clearTimeout(addFolderTimeout);

          disposable.dispose();

          resolve();
        }
      });

      const addFolderTimeout = setTimeout(() => {
        disposable.dispose();

        reject(
          new Error(
            `Adding workspace folder ${projectPath} was cancelled by timeout ${this.updateWorkspaceFolderTimeout} ms`
          )
        );
      }, this.updateWorkspaceFolderTimeout);

      theia.workspace.updateWorkspaceFolders(workspaceFolders ? workspaceFolders.length : 0, undefined, {
        uri: theia.Uri.file(projectPath),
      });
    });
  }

  protected toValidWorkspaceFolderPath(path: string): string {
    if (path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }
}
