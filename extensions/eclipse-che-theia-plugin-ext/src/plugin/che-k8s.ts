/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheK8S, CheK8SMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { K8SRawResponse } from '@eclipse-che/theia-remote-api/lib/common/k8s-service';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheK8SImpl implements CheK8S {
  private readonly cheK8S: CheK8SMain;

  constructor(rpc: RPCProtocol) {
    this.cheK8S = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_K8S_MAIN);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendRawQuery(requestURL: string, opts: any): Promise<K8SRawResponse> {
    return this.cheK8S.$sendRawQuery(requestURL, opts);
  }
}
