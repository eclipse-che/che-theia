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

import { findKey, isEncrypted, output, registerKeyAskingPassword } from '../util/util';

import { MESSAGE_GET_KEYS_FAILED } from '../messages';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

@injectable()
export class KeyRegistry {
  async getEncryptedKeys(keys: cheApi.ssh.SshPair[]): Promise<string[]> {
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
    let keys: cheApi.ssh.SshPair[];
    try {
      keys = await che.ssh.getAll('vcs');
    } catch (e) {
      theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED);
      return;
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
