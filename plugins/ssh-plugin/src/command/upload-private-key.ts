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
import * as os from 'os';
import * as theia from '@theia/plugin';

import { BTN_CONTINUE, MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY, MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { access, mkdtemp, readFile, remove, unlink } from 'fs-extra';
import { getHostName, isEncrypted, registerKey, updateConfig, writeKey } from '../util/util';

import { Command } from './command';
import { R_OK } from 'constants';
import { injectable } from 'inversify';
import { join } from 'path';

@injectable()
export class UploadPrivateKey extends Command {
  constructor() {
    super('ssh:upload', 'SSH: Upload Private Key...');
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    let hostName = await getHostName(MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY);
    if (!hostName) {
      hostName = `default-${Date.now()}`;
    }

    const tempDir = await mkdtemp(join(os.tmpdir(), 'private-key-'));
    let uploadedFilePaths: theia.Uri[] | undefined;
    try {
      uploadedFilePaths = await theia.window.showUploadDialog({ defaultUri: theia.Uri.file(tempDir) });
    } catch (error) {
      console.error(error.message);
    }

    if (!uploadedFilePaths) {
      await theia.window.showErrorMessage('Failure to upload private key', ...actions);
      return;
    }

    const privateKeyPath = uploadedFilePaths[0];
    await access(privateKeyPath.path, R_OK);

    let keyFile: string | undefined;
    try {
      const keyContent = (await readFile(privateKeyPath.path)).toString();
      await che.ssh.create({ name: hostName, service: 'vcs', privateKey: keyContent });

      keyFile = await writeKey(hostName, keyContent);

      if (await this.registerKey(keyFile, actions)) {
        await updateConfig(hostName);
        await theia.window.showInformationMessage(`Private key ${hostName} has been uploaded successfully`, ...actions);

        if (!(context && context.gitCloneFlow)) {
          // Dispaly this notification only when it's not a part of git clone flow
          await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE, ...actions);
        }

        return;
      }
    } catch (error) {
      await theia.window.showErrorMessage(`Failure to upload SSH key. ${error}`, ...actions);
    }

    await unlink(privateKeyPath.path);
    await remove(tempDir);

    if (keyFile) {
      await remove(keyFile);
    }
  }

  private async registerKey(keyFile: string, actions: string[]): Promise<boolean> {
    if (await isEncrypted(keyFile)) {
      const passphrase = await theia.window.showInputBox({
        placeHolder: 'Enter passphrase for key',
        password: true,
        ignoreFocusOut: true,
      });

      if (passphrase) {
        registerKey(keyFile, passphrase);
      } else {
        await theia.window.showErrorMessage('Passphrase for key was not entered', ...actions);
        return false;
      }
    } else {
      registerKey(keyFile, '');
    }

    return true;
  }
}
