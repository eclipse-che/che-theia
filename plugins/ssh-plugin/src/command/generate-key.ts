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

import { BTN_CONTINUE, MESSAGE_NEED_RESTART_WORKSPACE } from '../messages';
import { updateConfig, writeKey } from '../util/util';

import { Command } from './command';
import { injectable } from 'inversify';

@injectable()
export class GenerateKey extends Command {
  constructor() {
    super('ssh:generate', 'SSH: Generate Key...');
  }

  async run(context?: { gitCloneFlow?: boolean }): Promise<void> {
    const actions = context && context.gitCloneFlow ? [BTN_CONTINUE] : [];

    const keyName = `default-${Date.now()}`;
    try {
      const key = await che.ssh.generate('vcs', keyName);
      await updateConfig(keyName);
      await writeKey(keyName, key.privateKey!);
      const VIEW = 'View';
      const viewActions: string[] = context && context.gitCloneFlow ? [VIEW, BTN_CONTINUE] : [VIEW];
      const action = await theia.window.showInformationMessage(
        'Key pair successfully generated, do you want to view the public key?',
        ...viewActions
      );
      if (action === VIEW && key.privateKey) {
        const document = await theia.workspace.openTextDocument({ content: key.publicKey })!;
        await theia.window.showTextDocument(document!);
      }

      await theia.window.showWarningMessage(MESSAGE_NEED_RESTART_WORKSPACE, ...actions);
    } catch (e) {
      await theia.window.showErrorMessage('Failure to generate SSH key.', ...actions);
    }
  }
}
