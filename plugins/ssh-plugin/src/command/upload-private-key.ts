/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as os from 'os';
import * as theia from '@theia/plugin';

import { BTN_CONTINUE, MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY } from '../messages';
import { access, mkdtemp, readFile, remove, unlink } from 'fs-extra';
import { askHostName, registerKeyAskingPassword, updateConfig, writeKey } from '../util/util';
import { inject, injectable } from 'inversify';

import { Command } from './command';
import { R_OK } from 'constants';
import { SshSecretHelper } from '../util/ssh-secret-helper';
import { join } from 'path';

@injectable()
export class UploadPrivateKey extends Command {
  @inject(SshSecretHelper)
  private sshSecretHelper: SshSecretHelper;

  constructor() {
    super('ssh:upload', 'SSH: Upload Private Key...');
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    let hostName = await askHostName(MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY);
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
      await this.sshSecretHelper.store({ name: hostName, publicKey: 'empty public key', privateKey: keyContent });

      keyFile = await writeKey(hostName, keyContent);

      if (await registerKeyAskingPassword(keyFile, false, actions)) {
        await updateConfig(hostName);

        if (context && context.gitCloneFlow) {
          theia.window.showInformationMessage(`Private key ${hostName} has been uploaded successfully`);
        } else {
          theia.window.showInformationMessage(
            `Private key ${hostName} has been uploaded successfully. To make it available in all workspace containers please restart your workspace.`
          );
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
}
