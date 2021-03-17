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

import { BTN_CONTINUE, MESSAGE_GET_KEYS_FAILED, MESSAGE_NO_SSH_KEYS } from '../messages';
import { getKeyFilePath, updateConfig } from '../util/util';
import { pathExists, unlink } from 'fs-extra';

import { Command } from './command';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

@injectable()
export class DeleteKey extends Command {
  constructor() {
    super('ssh:delete', 'SSH: Delete Key...');
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    let keys: cheApi.ssh.SshPair[];
    try {
      keys = await che.ssh.getAll('vcs');
    } catch (e) {
      await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
      return;
    }

    if (keys.length === 0) {
      await theia.window.showWarningMessage(MESSAGE_NO_SSH_KEYS, ...actions);
      return;
    }

    const key = await theia.window.showQuickPick<theia.QuickPickItem>(
      keys.map(k => ({ label: k.name ? k.name : '' })),
      {}
    );

    if (!key) {
      return;
    }

    try {
      await che.ssh.deleteKey('vcs', key.label);
      const keyFile = getKeyFilePath(key.label);
      if (await pathExists(keyFile)) {
        await unlink(keyFile);
        await updateConfig(key.label);
      }

      theia.window.showInformationMessage(`Key ${key.label} successfully deleted`, ...actions);
    } catch (error) {
      theia.window.showErrorMessage(error, ...actions);
    }
  }
}
