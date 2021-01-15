/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as k8s from '@kubernetes/client-node';

import { CheK8SService, K8SRawResponse } from '../common/k8s-service';

import { injectable } from 'inversify';

const request = require('request');

@injectable()
export class CheK8SServiceImpl implements CheK8SService {
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromCluster();
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
}
