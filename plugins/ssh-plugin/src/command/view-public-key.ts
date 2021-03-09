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

import { BTN_CONTINUE, MESSAGE_GET_KEYS_FAILED, MESSAGE_NO_SSH_KEYS } from '../messages';

import { Command } from './command';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

const FILE_SCHEME = 'publickey';

// export const SSH_VIEW: theia.CommandDescription = {
//   id: 'ssh:view',
//   label: 'SSH: View Public Key...',
// };

@injectable()
export class ViewPublicKey extends Command {
  constructor() {
    super('ssh:view', 'SSH: View Public Key...');

    theia.workspace.registerTextDocumentContentProvider(FILE_SCHEME, {
      async provideTextDocumentContent(uri: theia.Uri, token: theia.CancellationToken): Promise<string | undefined> {
        let keyName = uri.path;
        if (keyName.startsWith('ssh@')) {
          keyName = keyName.substring('ssh@'.length);
        }

        const key = await che.ssh.get('vcs', keyName);
        return key.publicKey;
      },
    });
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    let keys: cheApi.ssh.SshPair[];
    try {
      keys = await che.ssh.getAll('vcs');
    } catch (e) {
      await theia.window.showErrorMessage(MESSAGE_GET_KEYS_FAILED, ...actions);
      return;
    }

    if (keys.length === 0) {
      await theia.window.showWarningMessage(MESSAGE_NO_SSH_KEYS, ...actions);
      return;
    }

    const key = await theia.window.showQuickPick<theia.QuickPickItem>(
      keys.map(k => ({ label: k.name ? k.name : '' })),
      {}
    );

    if (!key) {
      return;
    }

    try {
      const uri = theia.Uri.parse(`${FILE_SCHEME}:ssh@${key.label}`);
      const document = await theia.workspace.openTextDocument(uri);
      if (document) {
        await theia.window.showTextDocument(document, { preview: true });
        return;
      }
    } catch (error) {
      await theia.window.showErrorMessage(`Unable to open SSH key ${key.label}`, ...actions);
      console.error(error.message);
    }

    await theia.window.showErrorMessage(`Failure to open ${key.label}`, ...actions);
  }
}
