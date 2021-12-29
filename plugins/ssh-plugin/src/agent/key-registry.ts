/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { SshPair, SshSecretHelper } from '../util/ssh-secret-helper';
import { findKey, isEncrypted, output, registerKeyAskingPassword, updateConfig } from '../util/util';
import { inject, injectable } from 'inversify';

import { MESSAGE_GET_KEYS_FAILED } from '../messages';

@injectable()
export class KeyRegistry {
  @inject(SshSecretHelper) private sshSecretHelper: SshSecretHelper;
  async getEncryptedKeys(keys: SshPair[]): Promise<string[]> {
    const encryptedKeys: string[] = [];
    for (const key of keys) {
      try {
        const keyFile = await findKey(key.name);
        if (keyFile && (await isEncrypted(keyFile))) {
          encryptedKeys.push(keyFile);
        }
      } catch (err) {
        output.appendLine(`Unable to ckeck SSH key ${key.name}`);
      }
    }

    return encryptedKeys;
  }

  async init(): Promise<void> {
    let keys: SshPair[];
    try {
      keys = await this.sshSecretHelper.getAll();
    } catch (e) {
      theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED);
      return;
    }

    // Restore keys
    const sshDir = path.resolve(os.homedir(), '.ssh');
    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { recursive: true });
    }
    for (const key of keys) {
      const keyPath: string = path.resolve(sshDir, key.name);
      if (!fs.existsSync(keyPath)) {
        await fs.appendFile(keyPath, key.privateKey);
        await fs.appendFile(keyPath + '.pub', key.publicKey);
        await updateConfig(key.name);
        // change permissions
        await fs.chmod(keyPath, '600');
      }
    }

    const encryptedKeys = await this.getEncryptedKeys(keys);
    if (encryptedKeys.length === 0) {
      return;
    }

    const message =
      encryptedKeys.length === 1
        ? 'You have encrypted SSH key. Would you like to add it to SSH authentication agent?'
        : `You have ${encryptedKeys.length} encrypted SSH keys. Would you like to add them to SSH authentication agent?`;

    const SKIP = 'Skip';
    const ADD = 'Add To SSH Agent';
    const buttons = [SKIP, ADD];
    const action = await theia.window.showInformationMessage(message, ...buttons);
    if (action === ADD) {
      for (const keyFile of encryptedKeys) {
        try {
          await registerKeyAskingPassword(keyFile, true);
          const keyAddedMessage = `Key ${keyFile} has been added to SSH authentication agent`;
          theia.window.showInformationMessage(keyAddedMessage);
        } catch (err) {
          output.show(true);
          output.appendLine(err && err.message ? err.message : err);
        }
      }
    }
  }
}
