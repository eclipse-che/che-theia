/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as k8s from '@kubernetes/client-node';
import * as os from 'os';
import * as path from 'path';

import { CheK8SService, K8SRawResponse } from '@eclipse-che/theia-remote-api/lib/common/k8s-service';

import { ApiType } from '@kubernetes/client-node';
import { Emitter } from '@theia/core';
import { injectable } from 'inversify';

const request = require('request');

@injectable()
export class K8SServiceImpl implements CheK8SService {
  private kc: k8s.KubeConfig;
  private onK8sUserUpdatedEmitter = new Emitter<boolean>();
  private onK8sUserUpdatedEvent = this.onK8sUserUpdatedEmitter.event;
  private isK8sUserUpdated: boolean = false;

  constructor() {
    const kubeconfigPath = path.resolve(os.homedir(), '.kube', 'config');
    const tokenPath: string = path.resolve(os.homedir(), '.kube', 'token');
    this.checkExistsWithTimeout(kubeconfigPath.toString(), 30000)
      .then(() => {
        const kubeconfig: k8s.KubeConfig = JSON.parse(fs.readFileSync(kubeconfigPath).toString());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kubeconfigUser: any = kubeconfig.users.find(user => user.name === 'developer');
        if (kubeconfigUser) {
          fs.writeFileSync(tokenPath, kubeconfigUser.user.token);
        }
        // this.kc.loadFromCluster();
        this.kc.users[this.kc.users.findIndex(user => user.name === 'inClusterUser')].authProvider.config.tokenFile =
          tokenPath;
        this.isK8sUserUpdated = true;
        this.onK8sUserUpdatedEmitter.fire(true);
      })
      .catch(() => {
        this.onK8sUserUpdatedEmitter.fire(false);
        // this.kc.loadFromCluster();
      });
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromCluster();
  }

  private checkExistsWithTimeout(filePath: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        watcher.close();
        reject(new Error('File did not exists and was not created during the timeout.'));
      }, timeout);

      fs.ensureDirSync(path.resolve(os.homedir(), '.kube'));
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath);
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (eventType === 'rename' && filename === basename) {
          clearTimeout(timer);
          watcher.close();
          resolve();
        }
      });
    });
  }

  private async ensureK8sUserIsUpdated(): Promise<void> {
    if (!this.isK8sUserUpdated) {
      return new Promise(resolve => {
        this.onK8sUserUpdatedEvent(() => resolve());
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendRawQuery(requestURL: string, opts: any): Promise<K8SRawResponse> {
    await this.ensureK8sUserIsUpdated();
    this.kc.applyToRequest(opts);
    const cluster = this.kc.getCurrentCluster();
    if (!cluster) {
      throw new Error('K8S cluster is not defined');
    }
    const URL = `${cluster.server}${requestURL}`;

    return this.makeRequest(URL, opts);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeRequest(URL: string, opts: any): Promise<K8SRawResponse> {
    return new Promise((resolve, reject) => {
      request.get(URL, opts, (error: string, response: { statusCode: number }, body: string) => {
        resolve({
          statusCode: response.statusCode,
          data: body,
          error: error,
        });
      });
    });
  }

  getConfig(): k8s.KubeConfig {
    return this.kc;
  }

  async makeApiClient<T extends ApiType>(apiClientType: new (server: string) => T): Promise<T> {
    await this.ensureK8sUserIsUpdated();
    return this.kc.makeApiClient(apiClientType);
  }
}
