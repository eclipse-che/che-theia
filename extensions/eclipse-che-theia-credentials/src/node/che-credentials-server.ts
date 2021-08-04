/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as k8s from '@kubernetes/client-node';

import { CredentialsServer, PasswordContent } from '../common/credentials-protocol';
import { inject, injectable } from 'inversify';

import { CheK8SServiceImpl } from '@eclipse-che/theia-remote-impl-che-server/lib/node/che-server-k8s-service-impl';
import { CheServerWorkspaceServiceImpl } from '@eclipse-che/theia-remote-impl-che-server/lib/node/che-server-workspace-service-impl';

@injectable()
export class CheCredentialsServer implements CredentialsServer {
  @inject(CheK8SServiceImpl)
  private readonly cheK8SService: CheK8SServiceImpl;

  @inject(CheServerWorkspaceServiceImpl)
  private readonly workspaceService: CheServerWorkspaceServiceImpl;

  private readonly CREDENTIALS_SECRET_NAME = 'workspace-credentials-secret';
  private readonly INFRASTRUCTURE_NAMESPACE = 'infrastructureNamespace';

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      const patch = [
        {
          op: 'remove',
          path: `/data/${this.getSecretDataItemName(service, account)}`,
        },
      ];
      const client = this.cheK8SService.makeApiClient(k8s.CoreV1Api);
      client.defaultHeaders = { Accept: 'application/json', 'Content-Type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH };
      await client.patchNamespacedSecret(this.CREDENTIALS_SECRET_NAME, await this.getWorkspaceNamespace(), patch);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async findCredentials(service: string): Promise<Array<{ account: string; password: string }>> {
    const secret = await this.cheK8SService
      .makeApiClient(k8s.CoreV1Api)
      .readNamespacedSecret(this.CREDENTIALS_SECRET_NAME, await this.getWorkspaceNamespace());
    const data = secret.body.data;
    return data
      ? Object.keys(data)
          .filter(key => key.startsWith(service))
          .map(key => ({
            account: key.substring(key.indexOf('_') + 1),
            password: Buffer.from(data[key], 'base64').toString('ascii'),
          }))
      : [];
  }

  async findPassword(service: string): Promise<string | undefined> {
    const secret = await this.cheK8SService
      .makeApiClient(k8s.CoreV1Api)
      .readNamespacedSecret(this.CREDENTIALS_SECRET_NAME, await this.getWorkspaceNamespace());
    const data = secret.body.data;
    if (data) {
      const result = Object.keys(data).find(key => key.startsWith(service));
      if (result) {
        return Buffer.from(data[result], 'base64').toString('ascii');
      }
    }
  }

  async getPassword(service: string, account: string): Promise<PasswordContent | undefined> {
    const secret = await this.cheK8SService
      .makeApiClient(k8s.CoreV1Api)
      .readNamespacedSecret(this.CREDENTIALS_SECRET_NAME, await this.getWorkspaceNamespace());
    const data = secret.body.data;
    if (data && data[this.getSecretDataItemName(service, account)]) {
      return {
        extensionId: service,
        content: Buffer.from(secret.body.data![this.getSecretDataItemName(service, account)], 'base64').toString(
          'ascii'
        ),
      };
    }
  }

  async setPassword(service: string, account: string, password: PasswordContent): Promise<void> {
    const client = this.cheK8SService.makeApiClient(k8s.CoreV1Api);
    client.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH,
    };
    await client.patchNamespacedSecret(this.CREDENTIALS_SECRET_NAME, await this.getWorkspaceNamespace(), {
      data: { [this.getSecretDataItemName(service, account)]: Buffer.from(password.content).toString('base64') },
    });
  }

  private getSecretDataItemName(service: string, account: string): string {
    return `${service}_${account}`;
  }

  private async getWorkspaceNamespace(): Promise<string> {
    // grab current workspace
    const workspace = await this.workspaceService.currentWorkspace();
    return workspace.attributes?.[this.INFRASTRUCTURE_NAMESPACE] || workspace.namespace || '';
  }
}
