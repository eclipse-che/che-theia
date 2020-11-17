/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  CheSideCarContentReader,
  CheSideCarContentReaderMain,
  CheSideCarContentReaderRegistry,
  PLUGIN_RPC_CONTEXT,
} from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { interfaces } from 'inversify';

export class CheSideCarContentReaderMainImpl implements CheSideCarContentReaderMain {
  private readonly delegate: CheSideCarContentReader;
  private readonly registry: CheSideCarContentReaderRegistry;

  constructor(container: interfaces.Container, rpc: RPCProtocol) {
    this.delegate = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_SIDERCAR_CONTENT_READER);
    this.registry = container.get(CheSideCarContentReaderRegistry);
  }

  async $registerContentReader(scheme: string): Promise<void> {
    this.registry.register(
      scheme,
      async (uri, options?: { encoding?: string }) => await this.delegate.$read(uri, options)
    );
  }
}
