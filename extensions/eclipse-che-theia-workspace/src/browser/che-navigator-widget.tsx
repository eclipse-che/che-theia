/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as React from 'react';

import { Devfile, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

import { FileNavigatorWidget } from '@theia/navigator/lib/browser/navigator-widget';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceInputDialog } from '@theia/workspace/lib/browser/workspace-input-dialog';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject } from '@theia/core/shared/inversify';
import { injectable } from 'inversify';

@injectable()
export class CheFileNavigatorWidget extends FileNavigatorWidget {
  @inject(FileService) protected readonly fileService: FileService;
  @inject(DevfileService) protected readonly devfileService: DevfileService;
  @inject(WorkspaceService) protected readonly cheWorkspaceService: WorkspaceService;

  protected devfile: Devfile | undefined;
  protected projectsRootDirectory: string | undefined;

  protected renderEmptyMultiRootWorkspace(): React.ReactNode {
    if (this.devfile) {
      const projects = this.devfile.projects;
      if (projects && projects.length > 0) {
        return this.renderNoProjectsPanel();
      } else {
        return this.renderWelcomePanel();
      }
    } else {
      this.initialize().then(() => this.restartRendering());

      return this.renderNoProjectsPanel();
    }
  }

  protected renderNoProjectsPanel(): React.ReactNode {
    return (
      <div className="theia-navigator-container">
        <div className="center">No projects in the workspace yet</div>
      </div>
    );
  }

  protected renderWelcomePanel(): React.ReactNode {
    return (
      <div className="theia-navigator-container">
        <div className="label">No projects in the workspace yet.</div>
        <div className="label">You can clone a repository from a URL.</div>
        <div className="open-workspace-button-container">
          <button
            className="theia-button open-workspace-button"
            title="Clone Repository"
            onClick={this.cloneRepo}
            onKeyUp={this.keyUpHandler}
          >
            Clone Repository
          </button>
        </div>
        <div className="label">You can also add a new folder to the Che workspace.</div>
        <div className="open-workspace-button-container">
          <button
            className="theia-button open-workspace-button"
            title="Add a new folder to your workspace"
            onClick={this.newFolderToWorkspace}
            onKeyUp={this.keyUpHandler}
          >
            New Folder
          </button>
        </div>
      </div>
    );
  }

  protected newFolderToWorkspace = () => {
    const parent = new URI(this.projectsRootDirectory);
    const dialog = new WorkspaceInputDialog(
      {
        title: 'New Folder',
        parentUri: new URI(this.projectsRootDirectory),
        initialValue: 'Untitled',
      },
      this.labelProvider
    );
    dialog.open().then(async name => {
      if (name) {
        const folderUri = parent.resolve(name);
        await this.fileService.createFolder(folderUri);
      }
    });
  };

  protected cloneRepo = () => {
    return this.commandService.executeCommand('git.clone');
  };

  protected async initialize(): Promise<void> {
    if (!this.devfile) {
      this.devfile = await this.devfileService.get();
    }

    if (!this.projectsRootDirectory) {
      this.projectsRootDirectory = (await this.cheWorkspaceService.getProjectsRootDirectory()) || '/projects';
    }
  }

  private async restartRendering(): Promise<void> {
    super.render();
  }
}
