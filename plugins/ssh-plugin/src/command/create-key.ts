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

import { MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY, MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { askHostName, updateConfig, writeKey } from '../util/util';
import { inject, injectable } from 'inversify';

import { Command } from './command';
import { SshSecretHelper } from '../util/ssh-secret-helper';

@injectable()
export class CreateKey extends Command {
  @inject(SshSecretHelper) private sshSecretHelper: SshSecretHelper;

  constructor() {
    super('ssh:create', 'SSH: Create Key...');
  }

  async run(): Promise<void> {
    let keyName = await askHostName(MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY);
    if (!keyName) {
      keyName = `default-${Date.now()}`;
    }

    const publicKey = (await theia.window.showInputBox({ placeHolder: 'Enter public key' })) || '';
    const privateKey = (await theia.window.showInputBox({ placeHolder: 'Enter private key' })) || '';

    try {
      await this.sshSecretHelper.store({ name: keyName, privateKey, publicKey });
      await updateConfig(keyName);
      await writeKey(keyName, privateKey);
      await theia.window.showInformationMessage(`Key pair for ${keyName} successfully created`);
      await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
    } catch (error) {
      await theia.window.showErrorMessage(error);
    }
  }
}
