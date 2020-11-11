/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheOauth, CheOauthMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheOauthImpl implements CheOauth {
  private readonly oAuthMain: CheOauthMain;

  constructor(rpc: RPCProtocol) {
    this.oAuthMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_OAUTH_MAIN);
  }

  getProviders(): Promise<string[]> {
    return this.oAuthMain.$getProviders();
  }

  isAuthenticated(provider: string): Promise<boolean> {
    return this.oAuthMain.$isAuthenticated(provider);
  }

  isRegistered(provider: string): Promise<boolean> {
    return this.oAuthMain.$isRegistered(provider);
  }
}
