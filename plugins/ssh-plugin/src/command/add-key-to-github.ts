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

import {
  BTN_CONTINUE,
  MESSAGE_CANNOT_GENETARE_SSH_KEY,
  MESSAGE_GET_KEYS_FAILED,
  MESSAGE_NO_SSH_KEYS,
} from '../messages';
import { updateConfig, writeKey } from '../util/util';

import { Command } from './command';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

// export const SSH_ADD_TO_GITHUB: theia.CommandDescription = {
//   id: 'ssh:add_key_to_github',
//   label: 'SSH: Add Existing Key To GitHub...',
// };

@injectable()
export class AddKeyToGitHub extends Command {
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
    let keys: cheApi.ssh.SshPair[];
    try {
      keys = await che.ssh.getAll('vcs');
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
        keys.map(k => ({ label: k.name! })),
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

  private async generateGitHubKey(): Promise<cheApi.ssh.SshPair> {
    const key = await che.ssh.generate('vcs', 'github.com');
    await updateConfig('github.com');
    await writeKey('github.com', key.privateKey!);
    return key;
  }
}
