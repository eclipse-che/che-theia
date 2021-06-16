/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheHttp, CheHttpMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheHttpImpl implements CheHttp {
  private readonly cheHttpMain: CheHttpMain;

  constructor(rpc: RPCProtocol) {
    this.cheHttpMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_HTTP_MAIN);
  }

  async get(url: string): Promise<string | undefined> {
    return this.cheHttpMain.$get(url);
  }
}
