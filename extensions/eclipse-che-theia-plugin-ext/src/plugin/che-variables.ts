/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';

import { CheVariables, CheVariablesMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheVariablesImpl implements CheVariables {
  private readonly cheVariablesMain: CheVariablesMain;
  private readonly variablesCache = new Map<number, che.Variable>();
  private callId = 0;

  constructor(rpc: RPCProtocol) {
    this.cheVariablesMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_VARIABLES_MAIN);
  }

  async registerVariable(variable: che.Variable): Promise<che.Disposable> {
    const token = this.addNewVariable(variable);
    await this.cheVariablesMain.$registerVariable({
      name: variable.name,
      description: variable.description,
      token,
    });
    return {
      dispose: async () => {
        await this.cheVariablesMain.$disposeVariable(token);
        this.variablesCache.delete(token);
      },
    };
  }

  private addNewVariable(variable: che.Variable): number {
    const callId = this.callId++;
    this.variablesCache.set(callId, variable);
    return callId;
  }

  resolve(value: string): Promise<string | undefined> {
    return this.cheVariablesMain.$resolve(value);
  }

  async $resolveVariable(variableId: number): Promise<string | undefined> {
    const variable = this.variablesCache.get(variableId);
    if (variable) {
      if (variable.isResolved && variable.value) {
        return variable.value;
      }
      return await variable.resolve();
    }
  }
}
