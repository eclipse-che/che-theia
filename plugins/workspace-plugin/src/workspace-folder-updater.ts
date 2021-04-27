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

export interface WorkspaceFolderUpdater {
  addWorkspaceFolder(folderPath: string): Promise<void>;
  removeWorkspaceFolder(folderPath: string): Promise<void>;
}

export class WorkspaceFolderUpdaterImpl {
  promiseChain: Promise<void> = Promise.resolve();

  constructor(protected readonly timeout = 7000) {}

  addWorkspaceFolder(folderPath: string): Promise<void> {
    folderPath = this.normalizePath(folderPath);

    // remember the last promise in promise chain
    const previousPromise = this.promiseChain;

    // create a promise, that will add a workspace folder
    this.promiseChain = new Promise<void>((resolve, reject) => {
      previousPromise
        .catch(err => {
          console.log(err && err.message ? err.message : err);
        })
        .then(() => {
          // resolve promise if the folder already exists
          if (this.workspaceFolderExist(folderPath)) {
            resolve();
            return;
          }

          // timer to reset the operation when timeout
          const timeout = setTimeout(() => {
            disposable.dispose();
            reject(new Error(`Adding of workspace folder ${folderPath} was canceled by timeout`));
          }, this.timeout);

          // add workspace folder change listener
          const disposable = theia.workspace.onDidChangeWorkspaceFolders(event => {
            if (event.added.some(folder => folder.uri.path === folderPath)) {
              disposable.dispose();
              clearTimeout(timeout);
              resolve();
            }
          });

          // add the folder
          const index = theia.workspace.workspaceFolders ? theia.workspace.workspaceFolders.length : 0;
          const success = theia.workspace.updateWorkspaceFolders(index, undefined, {
            uri: theia.Uri.file(folderPath),
          });

          if (!success) {
            disposable.dispose();
            clearTimeout(timeout);
            reject(new Error(`Unable to add workspace folder ${folderPath}`));
          }
        });
    });

    return this.promiseChain;
  }

  async removeWorkspaceFolder(folderPath: string): Promise<void> {
    folderPath = this.normalizePath(folderPath);

    // remember the last promise in promise chain
    const previousPromise = this.promiseChain;

    // create a promise, that will remove a workspace folder
    this.promiseChain = new Promise<void>(async (resolve, reject) => {
      previousPromise
        .catch(err => {
          console.log(err && err.message ? err.message : err);
        })
        .then(() => {
          if (!theia.workspace.workspaceFolders) {
            resolve();
            return;
          }

          // take the folder index
          const index = theia.workspace.workspaceFolders.findIndex(folder => folder.uri.path === folderPath);
          // resolve promise if the folder does not exist
          if (index < 0) {
            resolve();
            return;
          }

          // timer to reset the operation when timeout
          const timeout = setTimeout(() => {
            disposable.dispose();
            reject(new Error(`Removing of workspace folder ${folderPath} was canceled by timeout`));
          }, this.timeout);

          // add workspace folder change listener
          const disposable = theia.workspace.onDidChangeWorkspaceFolders(event => {
            if (event.removed.some(folder => folder.uri.path === folderPath)) {
              disposable.dispose();
              clearTimeout(timeout);
              resolve();
            }
          });

          // remove the folder
          const success = theia.workspace.updateWorkspaceFolders(index, 1);

          if (!success) {
            disposable.dispose();
            clearTimeout(timeout);
            reject(new Error(`Unable to remove workspace folder ${folderPath}`));
          }
        });
    });

    return this.promiseChain;
  }

  workspaceFolderExist(folderPath: string): boolean {
    if (theia.workspace.workspaceFolders) {
      return theia.workspace.workspaceFolders.some(folder => folder.uri.path === folderPath);
    }

    return false;
  }

  protected normalizePath(path: string): string {
    if (path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }
}
