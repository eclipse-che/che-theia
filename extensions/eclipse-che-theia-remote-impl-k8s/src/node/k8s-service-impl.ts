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

import { ApiType, V1Pod } from '@kubernetes/client-node';
import { CheK8SService, K8SRawResponse } from '@eclipse-che/theia-remote-api/lib/common/k8s-service';
import { inject, injectable } from 'inversify';

import { K8sDevWorkspaceEnvVariables } from './k8s-devworkspace-env-variables';

const request = require('request');

@injectable()
export class K8SServiceImpl implements CheK8SService {
  private kc: k8s.KubeConfig;

  @inject(K8sDevWorkspaceEnvVariables)
  private env: K8sDevWorkspaceEnvVariables;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromCluster();
  }
  async getWorkspacePod(): Promise<V1Pod> {
    // get workspace pod
    const k8sCoreV1Api = this.makeApiClient(k8s.CoreV1Api);
    const labelSelector = `controller.devfile.io/workspace_id=${this.env.getWorkspaceId()}`;
    const { body } = await k8sCoreV1Api.listNamespacedPod(
      this.env.getWorkspaceNamespace(),
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    // ensure there is only one item
    if (body.items.length !== 1) {
      throw new Error(
        `Got invalid items when searching for objects with label selector ${labelSelector}. Expected only one resource`
      );
    }

    return body.items[0];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendRawQuery(requestURL: string, opts: any): Promise<K8SRawResponse> {
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

  makeApiClient<T extends ApiType>(apiClientType: new (server: string) => T): T {
    return this.kc.makeApiClient(apiClientType);
  }
}
