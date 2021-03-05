/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { inject, injectable } from 'inversify';
import { isEncrypted, registerKey } from '../util/util';

import { AddKeyToGitHub } from '../command/add-key-to-github';
import { GenerateKey } from '../command/generate-key';
import { MESSAGE_PERMISSION_DENIED_PUBLICKEY } from '../messages';
import { ViewPublicKey } from '../command/view-public-key';
import { che as cheApi } from '@eclipse-che/api';

@injectable()
export class GitListener {
  @inject(AddKeyToGitHub)
  private addKeyToGitHub: AddKeyToGitHub;

  @inject(GenerateKey)
  private generateKey: GenerateKey;

  @inject(ViewPublicKey)
  private viewPublicKey: ViewPublicKey;

  constructor() {}

  private keyPath(keyName: string | undefined): string {
    return keyName ? '/etc/ssh/private/' + keyName : '';
  }

  private passphrase(privateKey: string | undefined): string {
    return privateKey ? privateKey.substring(privateKey.indexOf('\npassphrase: ') + 13, privateKey.length - 1) : '';
  }

  private async getKeys(): Promise<cheApi.ssh.SshPair[]> {
    let keys: cheApi.ssh.SshPair[];
    try {
      keys = await che.ssh.getAll('vcs');
    } catch (e) {
      console.error(e.message);
      keys = [];
    }

    keys
      .filter(key => isEncrypted(this.keyPath(key.name)))
      .forEach(key => registerKey(this.keyPath(key.name), this.passphrase(key.privateKey)));

    return keys;
  }

  async init() {
    const keys = await this.getKeys();

    let gitLogHandlerInitialized: boolean;
    /* Git log handler, listens to Git events, catches the clone and push events.
          Asks to Upload a public SSH key if needed before these operations.
          Authenticates to Github if needed. */
    const onChange = () => {
      // Get the vscode Git plugin if the plugin is started.
      const gitExtension = theia.plugins.getPlugin('vscode.git');
      if (!gitLogHandlerInitialized && gitExtension && gitExtension.exports) {
        // Set the initialized flag to true state, to not to initialize the handler again on plugin change event.
        gitLogHandlerInitialized = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const git: any = gitExtension.exports._model.git;
        let command: string;
        let url: string;
        let path: string;
        const listener = async (out: string) => {
          // Parse Git log events.
          const split = out.split(' ');
          if (out.startsWith('> git clone') || out.startsWith('> git push')) {
            command = split[2];
            url = split[3];
            path = split[4];
            // Catch the remote access error.
          } else if (out.indexOf('Permission denied (publickey).') > -1) {
            // If the remote repository is a GitHub repository, ask to upload a public SSH key.
            if ((await che.oAuth.isRegistered('github')) && out.indexOf('git@github.com') > -1) {
              switch (command) {
                case 'clone': {
                  if (await this.addKeyToGitHub.run({ confirmMessage: MESSAGE_PERMISSION_DENIED_PUBLICKEY })) {
                    await git.clone(url, path.substring(0, path.lastIndexOf('/')));
                    theia.window.showInformationMessage(`Project ${url} successfully cloned to ${path}`);
                  }
                  break;
                }
                case 'push': {
                  if (await this.addKeyToGitHub.run({ confirmMessage: MESSAGE_PERMISSION_DENIED_PUBLICKEY })) {
                    theia.window.showInformationMessage(
                      'The public SSH key has been uploaded to Github, please try to push again.'
                    );
                  }
                  break;
                }
              }
              // If the remote repository is not a GitHub repository, show a proposal to manually add a public SSH key to related Git provider.
            } else {
              showWarningMessage(keys.length === 0);
            }
          }
        };
        // Set the git log listener.
        git.onOutput.addListener('log', listener);
      }
    };

    const showWarningMessage = (showGenerate: boolean, gitProviderName?: string) =>
      theia.window.showWarningMessage(`Permission denied, please ${
        showGenerate ? 'generate (F1 => ' + this.generateKey.label + ') and ' : ''
      }
              upload your public SSH key to ${
                gitProviderName ? gitProviderName : 'the Git provider'
              } and try again. To get the public key press F1 => ${this.viewPublicKey.label}`);

    theia.plugins.onDidChange(onChange);
  }
}
