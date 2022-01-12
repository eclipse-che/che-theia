/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as k8s from '@kubernetes/client-node';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { Buffer } from 'buffer';
import { CREDENTIALS_SECRET_NAME } from '../ssh-plugin';
import { injectable } from 'inversify';

@injectable()
export class SshSecretHelper {
  private k8sAPI: k8s.CoreV1Api;

  private getK8sCoreApi(): k8s.CoreV1Api {
    if (!this.k8sAPI) {
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      this.k8sAPI = kc.makeApiClient(k8s.CoreV1Api);
    }
    return this.k8sAPI;
  }

  async get(name: string): Promise<SshPair> {
    let data;
    try {
      const request = await this.getK8sCoreApi().readNamespacedSecret(
        CREDENTIALS_SECRET_NAME,
        await che.workspace.getCurrentNamespace()
      );
      data = request.body.data;
    } catch (e) {
      theia.window.showErrorMessage('Failed to retrieve the SSH secret' + e);
    }
    if (data && data[name]) {
      const privateKey = Buffer.from(data[name], 'base64').toString();
      const publicKey = Buffer.from(data[name + '.pub'], 'base64').toString();
      return { name, publicKey, privateKey };
    } else {
      throw new Error(`SSH key with name ${name} was not found`);
    }
  }

  async getAll(): Promise<SshPair[]> {
    let data: { [key: string]: string } | undefined;
    try {
      const request = await this.getK8sCoreApi().readNamespacedSecret(
        CREDENTIALS_SECRET_NAME,
        await che.workspace.getCurrentNamespace()
      );
      data = request.body.data;
    } catch (e) {
      theia.window.showErrorMessage('Failed to retrieve the SSH secret' + e);
    }
    const sshKeys: SshPair[] = [];
    if (data) {
      Object.keys(data)
        .filter(key => key.endsWith('.pub'))
        .forEach(key => {
          const name = key.substring(0, key.length - 4);
          sshKeys.push({
            name,
            publicKey: Buffer.from(data![key], 'base64').toString(),
            privateKey: Buffer.from(data![name], 'base64').toString(),
          });
        });
    }
    return sshKeys;
  }

  async store(ssh: SshPair): Promise<void> {
    const client = this.getK8sCoreApi();
    client.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH,
    };
    try {
      await client.patchNamespacedSecret(CREDENTIALS_SECRET_NAME, await che.workspace.getCurrentNamespace(), {
        data: { [ssh.name]: Buffer.from(ssh.privateKey).toString('base64') },
      });
      await client.patchNamespacedSecret(CREDENTIALS_SECRET_NAME, await che.workspace.getCurrentNamespace(), {
        data: { [ssh.name + '.pub']: Buffer.from(ssh.publicKey).toString('base64') },
      });
    } catch (e) {
      theia.window.showErrorMessage('Failed to store the SSH key pair' + e);
    }
    await this.updateSystemConfigFile(ssh.name);
  }

  async delete(name: string): Promise<void> {
    try {
      const patchPrivate = [
        {
          op: 'remove',
          path: `/data/${name}`,
        },
      ];
      const patchPublic = [
        {
          op: 'remove',
          path: `/data/${name}.pub`,
        },
      ];
      const client = this.getK8sCoreApi();
      client.defaultHeaders = { Accept: 'application/json', 'Content-Type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH };
      await client.patchNamespacedSecret(
        CREDENTIALS_SECRET_NAME,
        await che.workspace.getCurrentNamespace(),
        patchPrivate
      );
      await client.patchNamespacedSecret(
        CREDENTIALS_SECRET_NAME,
        await che.workspace.getCurrentNamespace(),
        patchPublic
      );
    } catch (e) {
      theia.window.showErrorMessage('Failed to delete the SSH secret' + e);
    }
    await this.updateSystemConfigFile(name);
  }

  private async updateSystemConfigFile(hostName: string): Promise<void> {
    const client = this.getK8sCoreApi();
    const namespace = await che.workspace.getCurrentNamespace();
    let data;
    try {
      const request = await client.readNamespacedSecret(CREDENTIALS_SECRET_NAME, namespace);
      data = request.body.data;
    } catch (e) {
      console.error('Failed to read the SSH secret' + e);
    }
    const configContent = data && data.ssh_config ? Buffer.from(data.ssh_config, 'base64').toString() : '';
    const configHost = hostName.startsWith('default-') ? '*' : hostName;
    const configIdentityFile = path.resolve('/etc/ssh', hostName);
    const keyConfig = `\nHost ${configHost}\nIdentityFile ${configIdentityFile}\nStrictHostKeyChecking = no\n`;
    client.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH,
    };
    try {
      if (configContent.indexOf(keyConfig) >= 0) {
        const newConfigContent = configContent.replace(keyConfig, '');
        await client.patchNamespacedSecret(CREDENTIALS_SECRET_NAME, namespace, {
          data: { ssh_config: Buffer.from(newConfigContent).toString('base64') },
        });
      } else {
        await client.patchNamespacedSecret(CREDENTIALS_SECRET_NAME, namespace, {
          data: { ssh_config: Buffer.from(configContent + keyConfig).toString('base64') },
        });
      }
    } catch (e) {
      console.error('Failed to store the SSH system-wide config file' + e);
    }
  }
}

export interface SshPair {
  name: string;
  publicKey: string;
  privateKey: string;
}
