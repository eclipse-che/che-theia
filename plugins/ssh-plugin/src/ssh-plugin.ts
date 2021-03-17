/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { inject, injectable } from 'inversify';

import { AddKeyToGitHub } from './command/add-key-to-github';
import { CreateKey } from './command/create-key';
import { DeleteKey } from './command/delete-key';
import { GenerateKey } from './command/generate-key';
import { GenerateKeyForHost } from './command/generate-key-for-host';
import { GitListener } from './git/git-listener';
import { UploadPrivateKey } from './command/upload-private-key';
import { ViewPublicKey } from './command/view-public-key';
import { bindings } from './inversify-bindings';

export interface PluginModel {
  configureSSH(gitHubActions: boolean): Promise<boolean>;
  addKeyToGitHub(): Promise<boolean>;
}

export async function start(): Promise<PluginModel> {
  return bindings().get(SSHPlugin).start();
}

export function stop(): void {}

@injectable()
export class SSHPlugin {
  @inject(GitListener)
  private gitListener: GitListener;

  @inject(AddKeyToGitHub)
  private addKeyToGitHub: AddKeyToGitHub;

  @inject(GenerateKey)
  private generateKey: GenerateKey;

  @inject(GenerateKeyForHost)
  private generateKeyForHost: GenerateKeyForHost;

  @inject(CreateKey)
  private createKey: CreateKey;

  @inject(DeleteKey)
  private deleteKey: DeleteKey;

  @inject(UploadPrivateKey)
  private uploadPrivateKey: UploadPrivateKey;

  @inject(ViewPublicKey)
  private viewPublicKey: ViewPublicKey;

  constructor() {}

  async start(): Promise<PluginModel> {
    await this.gitListener.init();

    theia.commands.registerCommand(this.generateKeyForHost, () => {
      this.generateKeyForHost.run();
    });
    theia.commands.registerCommand(this.generateKey, () => {
      this.generateKey.run();
    });
    theia.commands.registerCommand(this.createKey, () => {
      this.createKey.run();
    });
    theia.commands.registerCommand(this.deleteKey, () => {
      this.deleteKey.run();
    });
    theia.commands.registerCommand(this.viewPublicKey, () => {
      this.viewPublicKey.run();
    });
    theia.commands.registerCommand(this.uploadPrivateKey, () => {
      this.uploadPrivateKey.run();
    });
    theia.commands.registerCommand(this.addKeyToGitHub, () => {
      this.addKeyToGitHub.run();
    });

    return {
      configureSSH: async (gitHubActions: boolean) => this.showCommandPalette(gitHubActions),
      addKeyToGitHub: async () => this.addKeyToGitHub.run({ gitCloneFlow: true }),
    };
  }

  async showCommandPalette(gitHubActions: boolean): Promise<boolean> {
    const items: theia.QuickPickItem[] = [
      { label: this.generateKeyForHost.label },
      { label: this.generateKey.label },
      { label: this.viewPublicKey.label },
      { label: this.createKey.label },
      { label: this.deleteKey.label },
      { label: this.uploadPrivateKey.label },
    ];

    if (gitHubActions) {
      items.push({ label: this.addKeyToGitHub.label, showBorder: true });
    }

    const command = await theia.window.showQuickPick<theia.QuickPickItem>(items, {});

    if (command) {
      if (command.label === this.generateKeyForHost.label) {
        await this.generateKeyForHost.run();
        return true;
      } else if (command.label === this.generateKey.label) {
        await this.generateKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.viewPublicKey.label) {
        await this.viewPublicKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.createKey.label) {
        await this.createKey.run();
        return true;
      } else if (command.label === this.deleteKey.label) {
        await this.deleteKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.uploadPrivateKey.label) {
        await this.uploadPrivateKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.addKeyToGitHub.label) {
        await this.addKeyToGitHub.run({ gitCloneFlow: true });
        return true;
      }
    }

    return false;
  }
}
