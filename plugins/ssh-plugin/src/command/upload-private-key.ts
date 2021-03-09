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

import { MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY, MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { access, mkdtemp, readFile, remove, unlink } from 'fs-extra';
import { getHostName, getKeyFilePath, isEncrypted, registerKey, updateConfig, writeKey } from '../util/util';

import { Command } from './command';
import { R_OK } from 'constants';
import { injectable } from 'inversify';
import { join } from 'path';

// export const SSH_UPLOAD: theia.CommandDescription = {
//   id: 'ssh:upload',
//   label: 'SSH: Upload Private Key...',
// };

@injectable()
export class UploadPrivateKey extends Command {
  constructor() {
    super('ssh:upload', 'SSH: Upload Private Key...');
  }

  async run(): Promise<void> {
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
      await theia.window.showErrorMessage('No private key has been uploaded');
      return;
    }

    const privateKeyPath = uploadedFilePaths[0];

    await access(privateKeyPath.path, R_OK);

    const privateKeyContent = (await readFile(privateKeyPath.path)).toString();

    try {
      await che.ssh.create({ name: hostName, service: 'vcs', privateKey: privateKeyContent });
      await updateConfig(hostName);
      await writeKey(hostName, privateKeyContent);
      const keyPath = getKeyFilePath(hostName);
      let passphrase;
      if (await isEncrypted(keyPath)) {
        passphrase = await theia.window.showInputBox({ placeHolder: 'Enter passphrase for key', password: true });
        if (passphrase) {
          await registerKey(keyPath, passphrase);
        } else {
          await theia.window.showErrorMessage('Passphrase for key was not entered');
        }
      }

      await theia.window.showInformationMessage(`Key pair for ${hostName} successfully uploaded`);
      await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
    } catch (error) {
      theia.window.showErrorMessage(error);
    }

    await unlink(privateKeyPath.path);
    await remove(tempDir);
  }
}
