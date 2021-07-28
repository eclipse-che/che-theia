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

import { SSHAgent, SSHAgentConfig } from './agent/ssh-agent';
import { inject, injectable } from 'inversify';

import { AddKeyToGitHub } from './command/add-key-to-github';
import { CreateKey } from './command/create-key';
import { DeleteKey } from './command/delete-key';
import { GenerateKey } from './command/generate-key';
import { GenerateKeyForHost } from './command/generate-key-for-host';
import { GitListener } from './git/git-listener';
import { InversifyBinding } from './inversify-bindings';
import { KeyRegistry } from './agent/key-registry';
import { SSHPlugin } from './plugin/plugin-model';
import { UploadPrivateKey } from './command/upload-private-key';
import { ViewPublicKey } from './command/view-public-key';

export async function start(): Promise<SSHPlugin> {
  // disable this plug-in on DevWorkspace as there is no che API / ssh service
  if (process.env.DEVWORKSPACE_COMPONENT_NAME) {
    return {} as SSHPlugin;
  }

  const container = new InversifyBinding().initBindings();

  // start SSH authentication agent
  await container.get(SSHAgent).start();

  // add encrypted SSH keys to authentication agent
  await container.get(KeyRegistry).init();

  // handle output from vscode.git extension
  container.get(GitListener).init();

  // start SSH plugin
  return container.get(SSHPluginImpl).start();
}

export function stop(): void {}

@injectable()
export class SSHPluginImpl implements SSHPlugin {
  @inject(SSHAgent)
  private sshAgent: SSHAgent;

  @inject(AddKeyToGitHub)
  private cmdAddKeyToGitHub: AddKeyToGitHub;

  @inject(GenerateKey)
  private cmdGenerateKey: GenerateKey;

  @inject(GenerateKeyForHost)
  private cmdGenerateKeyForHost: GenerateKeyForHost;

  @inject(CreateKey)
  private cmdCreateKey: CreateKey;

  @inject(DeleteKey)
  private cmdDeleteKey: DeleteKey;

  @inject(UploadPrivateKey)
  private cmdUploadPrivateKey: UploadPrivateKey;

  @inject(ViewPublicKey)
  private cmdViewPublicKey: ViewPublicKey;

  constructor() {}

  start(): SSHPlugin {
    theia.commands.registerCommand(this.cmdGenerateKeyForHost, () => {
      this.cmdGenerateKeyForHost.run();
    });
    theia.commands.registerCommand(this.cmdGenerateKey, () => {
      this.cmdGenerateKey.run();
    });
    theia.commands.registerCommand(this.cmdCreateKey, () => {
      this.cmdCreateKey.run();
    });
    theia.commands.registerCommand(this.cmdDeleteKey, () => {
      this.cmdDeleteKey.run();
    });
    theia.commands.registerCommand(this.cmdViewPublicKey, () => {
      this.cmdViewPublicKey.run();
    });
    theia.commands.registerCommand(this.cmdUploadPrivateKey, () => {
      this.cmdUploadPrivateKey.run();
    });
    theia.commands.registerCommand(this.cmdAddKeyToGitHub, () => {
      this.cmdAddKeyToGitHub.run();
    });

    return this;
  }

  async configureSSH(gitHubActions: boolean): Promise<boolean> {
    const items: theia.QuickPickItem[] = [
      { label: this.cmdGenerateKeyForHost.label },
      { label: this.cmdGenerateKey.label },
      { label: this.cmdViewPublicKey.label },
      { label: this.cmdCreateKey.label },
      { label: this.cmdDeleteKey.label },
      { label: this.cmdUploadPrivateKey.label },
    ];

    if (gitHubActions) {
      items.push({ label: this.cmdAddKeyToGitHub.label });
    }

    const command = await theia.window.showQuickPick<theia.QuickPickItem>(items, {});

    if (command) {
      if (command.label === this.cmdGenerateKeyForHost.label) {
        await this.cmdGenerateKeyForHost.run();
        return true;
      } else if (command.label === this.cmdGenerateKey.label) {
        await this.cmdGenerateKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.cmdViewPublicKey.label) {
        await this.cmdViewPublicKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.cmdCreateKey.label) {
        await this.cmdCreateKey.run();
        return true;
      } else if (command.label === this.cmdDeleteKey.label) {
        await this.cmdDeleteKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.cmdUploadPrivateKey.label) {
        await this.cmdUploadPrivateKey.run({ gitCloneFlow: true });
        return true;
      } else if (command.label === this.cmdAddKeyToGitHub.label) {
        await this.cmdAddKeyToGitHub.run({ gitCloneFlow: true });
        return true;
      }
    }

    return false;
  }

  async addKeyToGitHub(): Promise<boolean> {
    return this.cmdAddKeyToGitHub.run({ gitCloneFlow: true });
  }

  async sshAgentConfig(): Promise<SSHAgentConfig> {
    return this.sshAgent.config;
  }
}
