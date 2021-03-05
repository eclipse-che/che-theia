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

import { MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY, MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { getHostName, updateConfig, writeKey } from '../util/util';

import { Command } from './command';
import { injectable } from 'inversify';

// export const SSH_CREATE: theia.CommandDescription = {
//   id: 'ssh:create',
//   label: 'SSH: Create Key...',
// };

@injectable()
export class CreateKey extends Command {
  constructor() {
    super();
    this.init('ssh:create', 'SSH: Create Key...');
  }

  async run(): Promise<void> {
    let hostName = await getHostName(MESSAGE_ENTER_KEY_NAME_OR_LEAVE_EMPTY);
    if (!hostName) {
      hostName = `default-${Date.now()}`;
    }
    const publicKey = await theia.window.showInputBox({ placeHolder: 'Enter public key' });
    const privateKey = await theia.window.showInputBox({ placeHolder: 'Enter private key' });

    try {
      await che.ssh.create({ name: hostName, service: 'vcs', publicKey: publicKey, privateKey });
      await updateConfig(hostName);
      await writeKey(hostName, privateKey!);
      await theia.window.showInformationMessage(`Key pair for ${hostName} successfully created`);
      await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
    } catch (error) {
      await theia.window.showErrorMessage(error);
    }
  }
}
