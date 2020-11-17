/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheDevfile, CheDevfileMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheDevfileImpl implements CheDevfile {
  private readonly devfileMain: CheDevfileMain;

  constructor(rpc: RPCProtocol) {
    this.devfileMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_DEVFILE_MAIN);
  }

  async createWorkspace(devfilePath: string): Promise<void> {
    try {
      return await this.devfileMain.$createWorkspace(devfilePath);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
