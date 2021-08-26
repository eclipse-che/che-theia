/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as git from './git';
import * as os from 'os';
import * as path from 'path';
import * as ssh from './ssh';
import * as theia from '@theia/plugin';

import { execute } from './exec';
import { getCertificate } from './ca-cert';

export interface TheiaImportCommand {
  /** @returns the path to the imported project */
  execute(): Promise<string>;
}

export function buildProjectImportCommand(
  project: che.devfile.DevfileProject,
  projectsRoot: string
): TheiaImportCommand | undefined {
  if (project.git || project.github) {
    return new TheiaGitCloneCommand(project, projectsRoot);
  } else if (project.zip) {
    return new TheiaImportZipCommand(project, projectsRoot);
  } else {
    const message = `Project ${JSON.stringify(project, undefined, 2)} is not supported.`;
    theia.window.showWarningMessage(message);
    console.warn(message);
    return;
  }
}

let output: theia.OutputChannel;

export class TheiaGitCloneCommand implements TheiaImportCommand {
  private projectName: string | undefined;
  private projectPath: string;
  private revision: string | undefined;
  private sparseCheckoutDirs: string[];
  private projectsRoot: string;
  private remotes: { [remoteName: string]: string };
  private defaultRemoteLocation: string;
  private defaultRemoteName: string;

  init(devfileProjectInfo: che.devfile.DevfileProjectInfo): void {
    this.remotes = devfileProjectInfo.remotes;
    if (devfileProjectInfo.checkoutFrom) {
      this.revision = devfileProjectInfo.checkoutFrom.revision;
    }
    if (devfileProjectInfo?.checkoutFrom?.remote) {
      this.defaultRemoteName = devfileProjectInfo.checkoutFrom.remote;
    } else {
      this.defaultRemoteName = Object.keys(this.remotes)[0];
    }
    this.defaultRemoteLocation = this.remotes[this.defaultRemoteName];
  }

  constructor(project: che.devfile.DevfileProject, projectsRoot: string) {
    if (project.git) {
      this.init(project.git);
    } else if (project.github) {
      this.init(project.github);
    }
    this.projectsRoot = projectsRoot;
    this.projectPath = project.clonePath
      ? path.join(projectsRoot, project.clonePath)
      : path.join(projectsRoot, project.name);

    this.sparseCheckoutDirs = project.sparseCheckoutDirs || [];
  }

  clone(): PromiseLike<string> {
    return theia.window.withProgress(
      {
        location: theia.ProgressLocation.Notification,
        title: `Cloning ${this.defaultRemoteLocation} ...`,
      },
      (progress, token) => {
        if (this.sparseCheckoutDirs.length > 0) {
          return this.gitSparseCheckout(progress, token);
        } else {
          return this.gitClone(progress, token);
        }
      }
    );
  }

  async isTrustedSource(source: string): Promise<boolean> {
    while (true) {
      const YES = 'Yes, I trust';
      const NO = "No, I don't trust";
      let action = await theia.window.showWarningMessage(`Do you trust the authors of ${source} ?`, YES, NO);

      if (action === YES) {
        return true;
      }

      const SKIP = 'Skip';
      const GO_BACK = 'Go Back';
      action = await theia.window.showWarningMessage(
        `Cloning of ${this.defaultRemoteLocation} will be skipped`,
        SKIP,
        GO_BACK
      );

      if (action === GO_BACK) {
        continue;
      }

      return false;
    }
  }

  async execute(): Promise<string> {
    if (!(await this.isTrustedSource(this.defaultRemoteLocation))) {
      return Promise.reject(new Error(`Cloning of ${this.defaultRemoteLocation} was skipped`));
    }

    if (!git.isSecureGitURI(this.defaultRemoteLocation)) {
      // clone using regular URI
      return this.clone();
    }

    // clone using SSH URI
    let errorReason: string | undefined;
    while (true) {
      // test secure login
      try {
        await ssh.updateSSHAgentConfig();
        await git.testSecureLogin(this.defaultRemoteLocation);
        // exit the loop when successfull login
        break;
      } catch (error) {
        if (!output) {
          output = theia.window.createOutputChannel('git clone');
        }

        output.show(true);
        output.appendLine(`> git clone ${this.defaultRemoteLocation}\r${error.message}`);

        errorReason = git.getErrorReason(error.message);
      }

      // unable to login
      // Give the user possible actions
      // - retry the login
      // - show SSH options

      const RETRY = 'Retry';
      const ADD_KEY_TO_GITHUB = 'Add Key To GitHub';
      const CONFIGURE_SSH = 'Configure SSH';

      let message = `Failure to clone git project ${this.defaultRemoteLocation}`;
      if (errorReason) {
        message += ` ${errorReason}`;
      }

      const isSecureGitHubURI = git.isSecureGitHubURI(this.defaultRemoteLocation);
      const buttons = isSecureGitHubURI ? [RETRY, ADD_KEY_TO_GITHUB, CONFIGURE_SSH] : [RETRY, CONFIGURE_SSH];
      const action = await theia.window.showWarningMessage(message, ...buttons);
      if (action === RETRY) {
        // Retry Secure login
        // Do nothing, just continue the loop
        continue;
      } else if (action === ADD_KEY_TO_GITHUB) {
        await ssh.addKeyToGitHub();
        continue;
      } else if (action === CONFIGURE_SSH) {
        await ssh.configureSSH(isSecureGitHubURI);
        continue;
      } else {
        // It seems user closed the popup.
        // Ask the user to retry cloning the project.
        const SKIP = 'Skip';
        const TRY_AGAIN = 'Try Again';
        const tryAgain = await theia.window.showWarningMessage(
          `Cloning of ${this.defaultRemoteLocation} will be skipped`,
          SKIP,
          TRY_AGAIN
        );
        if (tryAgain === TRY_AGAIN) {
          // continue the loop to try again
          continue;
        }
        // skip
        return Promise.reject(new Error(message));
      }

      break;
    }

    return this.clone();
  }

  // Clones git repository
  private async gitClone(
    progress: theia.Progress<{ message?: string; increment?: number }>,
    token: theia.CancellationToken
  ): Promise<string> {
    const args: string[] = ['clone', this.defaultRemoteLocation, this.projectPath];

    try {
      await git.execGit(this.projectsRoot, ...args);

      // Add extra remotes if defined
      if (Object.keys(this.remotes).length > 1) {
        await Promise.all(
          Object.entries(this.remotes).map(async ([remoteName, remoteValue]) => {
            if (this.defaultRemoteName !== remoteName) {
              const remoteArgs = ['remote', 'add', remoteName, remoteValue];
              await git.execGit(this.projectsRoot, ...remoteArgs);
            }
          })
        );
      }

      // Figure out what to reset to.
      // The priority order is startPoint > tag > commitId

      const messageStart = `Project ${this.defaultRemoteLocation} cloned to ${this.projectPath} using default branch`;

      if (this.revision) {
        git.execGit(this.projectPath, 'checkout', this.revision).then(
          _ => {
            theia.window.showInformationMessage(`${messageStart} which has been reset to ${this.revision}.`);
          },
          e => {
            theia.window.showErrorMessage(
              `${messageStart} but resetting to ${this.revision} failed with ${e.message}.`
            );
            console.log(
              `Couldn't reset to ${this.revision} of ${this.projectPath} cloned from ${this.defaultRemoteLocation} and checked from default branch.`,
              e
            );
          }
        );
      } else {
        theia.window.showInformationMessage(`${messageStart}.`);
      }
      return this.projectPath;
    } catch (e) {
      theia.window.showErrorMessage(`Couldn't clone ${this.defaultRemoteLocation}: ${e.message}`);
      console.log(`Couldn't clone ${this.defaultRemoteLocation}`, e);
      throw new Error(e);
    }
  }

  // Gets only specified directory from given repository
  private async gitSparseCheckout(
    progress: theia.Progress<{ message?: string; increment?: number }>,
    token: theia.CancellationToken
  ): Promise<string> {
    if (this.sparseCheckoutDirs.length === 0) {
      throw new Error('Parameter "sparseCheckoutDir" is not set for "' + this.projectName + '" project.');
    }

    await fs.ensureDir(this.projectPath);

    // if no revision is specified, use the HEAD
    await git.sparseCheckout(
      this.projectPath,
      this.defaultRemoteLocation,
      this.sparseCheckoutDirs,
      this.revision || 'HEAD'
    );

    theia.window.showInformationMessage(
      `Sources by template ${this.sparseCheckoutDirs} of ${this.defaultRemoteLocation} was cloned to ${this.projectPath}.`
    );
    return this.projectPath;
  }
}

export class TheiaImportZipCommand implements TheiaImportCommand {
  private locationURI: string | undefined;
  private projectDir: string;
  private tmpDir: string;
  private zipfile: string;
  private zipfilePath: string;

  constructor(project: che.devfile.DevfileProject, projectsRoot: string) {
    if (project.zip) {
      this.locationURI = project.zip.location;
    }
    this.projectDir = path.join(projectsRoot, project.name);
    this.tmpDir = fs.mkdtempSync(path.join(`${os.tmpdir()}${path.sep}`, 'workspace-plugin-'));
    this.zipfile = `${project.name}.zip`;
    this.zipfilePath = path.join(this.tmpDir, this.zipfile);
  }

  async execute(): Promise<string> {
    const importZip = async (
      progress: theia.Progress<{ message?: string; increment?: number }>,
      token: theia.CancellationToken
    ): Promise<string> => {
      try {
        // download
        const curlArgs = ['-sSL', '--output', this.zipfilePath];

        // with certificate
        const cert = await getCertificate;
        if (cert) {
          curlArgs.push('--cacert', cert);
        }

        curlArgs.push(this.locationURI!);
        await execute('curl', curlArgs);

        // expand
        fs.mkdirSync(this.projectDir);
        const unzipArgs = ['-q', '-n', '-d', this.projectDir, this.zipfilePath];
        await execute('unzip', unzipArgs);

        // clean
        fs.unlinkSync(this.zipfilePath);
        const zipfileParentDir = path.resolve(this.zipfilePath, '..');
        if (zipfileParentDir.indexOf(os.tmpdir() + path.sep) === 0) {
          fs.rmdirSync(zipfileParentDir);
        }
        return this.projectDir;
      } catch (e) {
        theia.window.showErrorMessage(`Couldn't import ${this.locationURI}: ${e.message}`);
        console.error(`Couldn't import ${this.locationURI}`, e);
        throw new Error(e);
      }
    };

    return theia.window.withProgress(
      {
        location: theia.ProgressLocation.Notification,
        title: `Importing ${this.locationURI} ...`,
      },
      (progress, token) => importZip(progress, token)
    );
  }
}
