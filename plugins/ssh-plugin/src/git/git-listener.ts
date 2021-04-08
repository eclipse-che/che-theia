/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { inject, injectable } from 'inversify';

import { SSHPlugin } from '../plugin/plugin-model';

const RETRY = 'Retry';
const ADD_KEY_TO_GITHUB = 'Add Key To GitHub';
const CONFIGURE_SSH = 'Configure SSH';

@injectable()
export class GitListener {
  @inject(SSHPlugin)
  private sshPlugin: SSHPlugin;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private git: any;

  private gitCommand: string = '';

  constructor() {}

  private async onGitOutput(data: string): Promise<void> {
    if (data.startsWith('> git clone') || data.startsWith('> git push')) {
      this.gitCommand = data;
      return;
    }

    if (data.indexOf('Permission denied (publickey).') < 0) {
      // In this listener we handle only issues with SSH key
      return;
    }

    // Parse Git log events.
    if (this.gitCommand.startsWith('> git clone') || this.gitCommand.startsWith('> git push')) {
      const split = this.gitCommand.split(' ');
      const command = split[2];
      const uri = split[3];
      const path = split[4];

      if (command === 'clone') {
        await this.handleGitClone(uri, path);
      } else if (command === 'push') {
        await this.handleGitPush(uri, path);
      }
    }
  }

  private isGitHubUri(uri: string): boolean {
    return uri.startsWith('git@github.com');
  }

  private async handleGitClone(uri: string, path: string): Promise<void> {
    const message = `Failure to clone git project ${uri}. A valid SSH key may be required.`;

    const gitHub = this.isGitHubUri(uri);
    const buttons = gitHub ? [RETRY, ADD_KEY_TO_GITHUB, CONFIGURE_SSH] : [RETRY, CONFIGURE_SSH];

    const action = await theia.window.showWarningMessage(message, ...buttons);
    if (action === RETRY) {
      await this.retryClone(uri, path);
    } else if (action === ADD_KEY_TO_GITHUB) {
      await this.sshPlugin.addKeyToGitHub();
      await this.retryClone(uri, path);
    } else if (action === CONFIGURE_SSH) {
      await this.sshPlugin.configureSSH(gitHub);
      await this.retryClone(uri, path);
    }
  }

  private async retryClone(uri: string, path: string) {
    await this.git.clone(uri, path.substring(0, path.lastIndexOf('/')));
  }

  private async handleGitPush(uri: string, path: string): Promise<void> {
    const message = `Failure to push git project ${uri}. A valid SSH key may be required.`;

    const gitHub = this.isGitHubUri(uri);
    const buttons = gitHub ? [ADD_KEY_TO_GITHUB, CONFIGURE_SSH] : [CONFIGURE_SSH];

    const action = await theia.window.showWarningMessage(message, ...buttons);
    if (action === ADD_KEY_TO_GITHUB) {
      await this.sshPlugin.addKeyToGitHub();
    } else if (action === CONFIGURE_SSH) {
      await this.sshPlugin.configureSSH(gitHub);
    }
  }

  init() {
    let initialized: boolean;
    const onChange = () => {
      const vscodeGit = theia.plugins.getPlugin('vscode.git');
      if (vscodeGit && vscodeGit.exports && !initialized) {
        initialized = true;
        this.git = vscodeGit.exports._model.git;
        this.git.onOutput.addListener('log', async (data: string) => this.onGitOutput(data));
      }
    };

    theia.plugins.onDidChange(onChange);
  }
}
