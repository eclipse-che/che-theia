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

import { BTN_CONTINUE, MESSAGE_GET_KEYS_FAILED, MESSAGE_NO_SSH_KEYS } from '../messages';
import { SshPair, SshSecretHelper } from '../util/ssh-secret-helper';
import { findKey, getKeyFilePath, updateConfig } from '../util/util';
import { inject, injectable } from 'inversify';
import { pathExists, remove, unlink } from 'fs-extra';

import { Command } from './command';

@injectable()
export class DeleteKey extends Command {
  @inject(SshSecretHelper)
  private sshSecretHelper: SshSecretHelper;

  constructor() {
    super('ssh:delete', 'SSH: Delete Key...');
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    let keys: SshPair[];
    try {
      keys = await this.sshSecretHelper.getAll();
    } catch (e) {
      await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
      return;
    }

    if (keys.length === 0) {
      await theia.window.showWarningMessage(MESSAGE_NO_SSH_KEYS, ...actions);
      return;
    }

    const items: theia.QuickPickItem[] = [];
    for (const key of keys) {
      if (!key.name) {
        continue;
      }

      const filePath = await findKey(key.name);
      const item: theia.QuickPickItem = {
        label: key.name,
        detail: filePath,
      };

      items.push(item);
    }

    const key = await theia.window.showQuickPick<theia.QuickPickItem>(items, {});
    if (!key) {
      return;
    }

    try {
      await this.sshSecretHelper.delete(key.label);
      const keyFile = getKeyFilePath(key.label);
      if (await pathExists(keyFile)) {
        await unlink(keyFile);
        await remove(keyFile);
        await remove(keyFile + '.pub');
        await updateConfig(key.label);
      }

      theia.window.showInformationMessage(`Key ${key.label} successfully deleted`, ...actions);
    } catch (error) {
      theia.window.showErrorMessage(error, ...actions);
    }
  }
}
