/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { VariableRegistry, VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { Disposable, MaybePromise } from '@theia/core';
import { PLUGIN_RPC_CONTEXT, CheVariables, CheVariablesMain, Variable } from '../common/che-protocol';

export class CheVariablesMainImpl implements CheVariablesMain {

    private readonly proxy: CheVariables;
    private readonly variableResolverService: VariableResolverService;
    private readonly variableRegistry: VariableRegistry;
    private readonly disposableMap: Map<number, Disposable>;

    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_VARIABLES);
        this.variableResolverService = container.get(VariableResolverService);
        this.variableRegistry = container.get(VariableRegistry);
        this.disposableMap = new Map();
    }

    async $registerVariable(variable: Variable): Promise<void> {
        const handle = (id: number) =>
            this.proxy.$resolveVariable(id);
        const disposable = this.variableRegistry.registerVariable({
            name: variable.name,
            description: variable.description,
            resolve(): MaybePromise<string | undefined> {
                return handle(variable.token);
            }
        });
        this.disposableMap.set(variable.token, disposable);
    }

    async $disposeVariable(id: number): Promise<void> {
        const disposable = this.disposableMap.get(id);
        if (disposable) {
            disposable.dispose();
            this.disposableMap.delete(id);
        }
    }

    $resolve(value: string): Promise<string | undefined> {
        return this.variableResolverService.resolve(value);
    }

}
