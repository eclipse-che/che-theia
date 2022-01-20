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
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as theia from '@theia/plugin';

import {
  BTN_CONTINUE,
  MESSAGE_CANNOT_GENETARE_SSH_KEY,
  MESSAGE_GET_KEYS_FAILED,
  MESSAGE_NO_SSH_KEYS,
} from '../messages';
import { SshPair, SshSecretHelper } from '../util/ssh-secret-helper';
import { generateKey, updateConfig } from '../util/util';
import { inject, injectable } from 'inversify';

import { Command } from './command';
import { che as cheApi } from '@eclipse-che/api';

@injectable()
export class AddKeyToGitHub extends Command {
  @inject(SshSecretHelper)
  private sshSecretHelper: SshSecretHelper;

  constructor() {
    super('ssh:add_key_to_github', 'SSH: Add Existing Key To GitHub...');
  }

  async run(context?: { gitCloneFlow?: boolean; confirmMessage?: string }): Promise<boolean> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    if (context && context.confirmMessage) {
      const confirm = await theia.window.showWarningMessage(context.confirmMessage, 'Add Key To GitHub');
      if (confirm === undefined) {
        return false;
      }
    }

    // get list of keys
    let keys: SshPair[];
    try {
      keys = await this.sshSecretHelper.getAll();
    } catch (e) {
      await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
      return false;
    }

    if (keys.length === 0) {
      const GENERATE = 'Generate';
      const CANCEL = 'Cancel';
      const action = await theia.window.showWarningMessage(
        `${MESSAGE_NO_SSH_KEYS} Do you want to generate new one?`,
        GENERATE,
        CANCEL
      );
      if (action === GENERATE) {
        try {
          keys.push(await this.generateGitHubKey());
        } catch (e) {
          await theia.window.showErrorMessage(MESSAGE_CANNOT_GENETARE_SSH_KEY);
          return false;
        }
      } else {
        return false;
      }
    }

    // filter keys, leave only with names and that have public keys
    keys = keys.filter(key => key.name && key.publicKey);

    let key: cheApi.ssh.SshPair | undefined;
    if (keys.length === 1) {
      // only one key has been found
      // use it
      key = keys[0];
    } else {
      // pick key from the list
      const keyName = await theia.window.showQuickPick<theia.QuickPickItem>(
        keys.map(k => ({ label: k.name })),
        {}
      );

      if (!keyName) {
        // user closed the popup
        return false;
      }

      key = keys.find(k => k.name && k.name === keyName.label);
    }

    try {
      if (key && key.publicKey) {
        await che.github.uploadPublicSshKey(key.publicKey);
        return true;
      } else {
        await theia.window.showErrorMessage('Unable to find public key.', ...actions);
      }
    } catch (error) {
      console.error(error.message);
      await theia.window.showErrorMessage('Failure to add public key to GitHub.', ...actions);
    }

    return false;
  }

  private async generateGitHubKey(): Promise<SshPair> {
    const keyName = 'github.com';
    await generateKey(keyName);
    await updateConfig('github.com');
    const sshPath = path.resolve(os.homedir(), '.ssh', keyName);
    const sshPair = {
      name: keyName,
      privateKey: fs.readFileSync(sshPath).toString(),
      publicKey: fs.readFileSync(sshPath + '.pub').toString(),
    };
    await this.sshSecretHelper.store(sshPair);
    return sshPair;
  }
}
