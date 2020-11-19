/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheK8SService, K8SRawResponse } from '@eclipse-che/theia-remote-api/lib/common/k8s-service';

import { CheK8SMain } from '../common/che-protocol';
import { interfaces } from 'inversify';

export class CheK8SMainImpl implements CheK8SMain {
  private readonly cheK8SService: CheK8SService;

  constructor(container: interfaces.Container) {
    this.cheK8SService = container.get(CheK8SService);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $sendRawQuery(requestURL: string, opts: any): Promise<K8SRawResponse> {
    return this.cheK8SService.sendRawQuery(requestURL, opts);
  }
}
