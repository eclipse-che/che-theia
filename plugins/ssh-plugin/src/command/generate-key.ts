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

import { BTN_CONTINUE, MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { inject, injectable } from 'inversify';

import { Command } from './command';
import { SshSecretHelper } from '../util/ssh-secret-helper';
import { spawn } from 'child_process';
import { updateConfig } from '../util/util';

@injectable()
export class GenerateKey extends Command {
  @inject(SshSecretHelper)
  private sshSecretHelper: SshSecretHelper;

  constructor() {
    super('ssh:generate', 'SSH: Generate Key...');
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    const keyName = `default-${Date.now()}`;
    const sshPath = path.resolve(os.homedir(), '.ssh', keyName);
    const generate = new Promise<void>((resolve, reject) => {
      const command = spawn('ssh-keygen', ['-b', '4096', '-f', sshPath, '-N', '']);
      command.stderr.on('data', async data => {
        reject(data);
      });
      command.on('close', () => {
        resolve();
      });
    });
    try {
      await generate;
      await updateConfig(keyName);
      await this.sshSecretHelper.store({
        name: keyName,
        privateKey: fs.readFileSync(sshPath).toString(),
        publicKey: fs.readFileSync(sshPath + '.pub').toString(),
      });
      const VIEW = 'View';
      const viewActions: string[] = context && context.gitCloneFlow ? [VIEW, BTN_CONTINUE] : [VIEW];
      const action = await theia.window.showInformationMessage(
        'Key pair successfully generated, do you want to view the public key?',
        ...viewActions
      );
      if (action === VIEW) {
        const document = await theia.workspace.openTextDocument({
          content: fs.readFileSync(sshPath + '.pub').toString(),
        })!;
        await theia.window.showTextDocument(document!);
      }

      await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE, ...actions);
    } catch (e) {
      await theia.window.showErrorMessage('Failure to generate SSH key.', ...actions);
    }
  }
}
