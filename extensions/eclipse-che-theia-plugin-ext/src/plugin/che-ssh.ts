/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheSsh, CheSshMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { che as cheApi } from '@eclipse-che/api';

export class CheSshImpl implements CheSsh {
  private readonly sshMain: CheSshMain;

  constructor(rpc: RPCProtocol) {
    this.sshMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_SSH_MAIN);
  }

  /**
   * @inheritDoc
   */
  async generate(service: string, name: string): Promise<cheApi.ssh.SshPair> {
    try {
      return this.sshMain.$generate(service, name);
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * @inheritDoc
   */
  async create(sshKeyPair: cheApi.ssh.SshPair): Promise<void> {
    try {
      return this.sshMain.$create(sshKeyPair);
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * @inheritDoc
   */
  async getAll(service: string): Promise<cheApi.ssh.SshPair[]> {
    try {
      return this.sshMain.$getAll(service);
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * @inheritDoc
   */
  async get(service: string, name: string): Promise<cheApi.ssh.SshPair> {
    try {
      return this.sshMain.$get(service, name);
    } catch (e) {
      throw new Error(e);
    }
  }

  /**
   * @inheritDoc
   */
  async delete(service: string, name: string): Promise<void> {
    try {
      return this.sshMain.$deleteKey(service, name);
    } catch (e) {
      throw new Error(e);
    }
  }
}
