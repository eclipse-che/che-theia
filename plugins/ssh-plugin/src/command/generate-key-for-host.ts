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

import { askHostName, updateConfig } from '../util/util';
import { inject, injectable } from 'inversify';

import { Command } from './command';
import { MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { SshSecretHelper } from '../util/ssh-secret-helper';
import { spawn } from 'child_process';

@injectable()
export class GenerateKeyForHost extends Command {
  @inject(SshSecretHelper)
  private sshSecretHelper: SshSecretHelper;

  constructor() {
    super('ssh:generate_for_host', 'SSH: Generate Key For Particular Host...');
  }

  async run(): Promise<void> {
    const keyName = await askHostName();
    if (!keyName) {
      return;
    }
    const sshPath = path.resolve(os.homedir(), '.ssh', keyName);
    const generate = new Promise<void>((resolve, reject) => {
      const command = spawn('ssh-keygen', ['-t', 'ed25519', '-f', sshPath, '-N', '""']);
      command.stderr.on('data', async data => {
        reject(data);
      });
      command.on('close', () => {
        resolve();
      });
    });
    await generate;
    await this.sshSecretHelper.store({
      name: keyName,
      privateKey: fs.readFileSync(sshPath, { encoding: 'base64' }),
      publicKey: fs.readFileSync(sshPath + '.pub', { encoding: 'base64' }),
    });
    await updateConfig(keyName);
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage(
      `Key pair for ${keyName} successfully generated, do you want to view the public key?`,
      viewAction
    );
    if (action === viewAction) {
      const document = await theia.workspace.openTextDocument({
        content: fs.readFileSync(sshPath + '.pub').toString(),
      });
      await theia.window.showTextDocument(document!);
    }

    await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
  }
}
