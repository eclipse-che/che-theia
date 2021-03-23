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
import { findKey, output } from '../util/util';

import { Command } from './command';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

const FILE_SCHEME = 'publickey';

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

    const items: theia.QuickPickItem[] = [];
    for (const key of keys) {
      if (!key.name) {
        continue;
      }

      const filePath = await findKey(key.name);
      const item: theia.QuickPickItem = {
        label: key.name,
        detail: filePath,
      };

      items.push(item);
    }

    const key = await theia.window.showQuickPick<theia.QuickPickItem>(items, {});
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
      output.show(true);
      output.appendLine(error.message);
    }

    await theia.window.showErrorMessage(`Unable to open SSH key ${key.label}`, ...actions);
  }
}
