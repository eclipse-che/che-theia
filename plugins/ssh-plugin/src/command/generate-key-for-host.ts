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

import { getHostName, updateConfig, writeKey } from '../util/util';

import { Command } from './command';
import { MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { injectable } from 'inversify';

// export const SSH_GENERATE_FOR_HOST: theia.CommandDescription = {
//   id: 'ssh:generate_for_host',
//   label: 'SSH: Generate Key For Particular Host...',
// };

@injectable()
export class GenerateKeyForHost extends Command {
  constructor() {
    super('ssh:generate_for_host', 'SSH: Generate Key For Particular Host...');
  }

  async run(): Promise<void> {
    const hostName = await getHostName();
    if (!hostName) {
      return;
    }
    const key = await che.ssh.generate('vcs', hostName);
    await updateConfig(hostName);
    await writeKey(hostName, key.privateKey!);
    const viewAction = 'View';
    const action = await theia.window.showInformationMessage(
      `Key pair for ${hostName} successfully generated, do you want to view the public key?`,
      viewAction
    );
    if (action === viewAction && key.privateKey) {
      const document = await theia.workspace.openTextDocument({ content: key.publicKey });
      await theia.window.showTextDocument(document!);
    }

    await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE);
  }
}
