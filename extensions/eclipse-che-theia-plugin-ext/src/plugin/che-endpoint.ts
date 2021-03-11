/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheEndpoint, CheEndpointMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { endpoint } from '@eclipse-che/plugin';

export class CheEndpointImpl implements CheEndpoint {
  private readonly endpointMain: CheEndpointMain;

  constructor(rpc: RPCProtocol) {
    this.endpointMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_ENDPOINT_MAIN);
  }

  async getEndpoints(): Promise<endpoint.ComponentExposedEndpoint[]> {
    return this.endpointMain.$getEndpoints();
  }
  async getEndpointsByName(...names: string[]): Promise<endpoint.ExposedEndpoint[]> {
    return this.endpointMain.$getEndpointsByName(...names);
  }

  async getEndpointsByType(type: string): Promise<endpoint.ExposedEndpoint[]> {
    return this.endpointMain.$getEndpointsByType(type);
  }
}
