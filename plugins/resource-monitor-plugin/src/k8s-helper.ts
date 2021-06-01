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

import { injectable } from 'inversify';

@injectable()
export class K8sHelper {
  private k8sAPI: k8s.CoreV1Api;

  initConfig(): k8s.KubeConfig {
    return new k8s.KubeConfig();
  }

  getCoreApi(): k8s.CoreV1Api {
    if (!this.k8sAPI) {
      const kc = this.initConfig();
      kc.loadFromDefault();
      this.k8sAPI = kc.makeApiClient(k8s.CoreV1Api);
    }
    return this.k8sAPI;
  }
}
