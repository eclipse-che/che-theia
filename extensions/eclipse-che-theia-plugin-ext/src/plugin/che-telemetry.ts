/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheTelemetry, CheTelemetryMain } from '../common/che-protocol';
import { CommandRegistryImpl } from '@theia/plugin-ext/lib/plugin/command-registry';
import { Emitter } from 'vscode-jsonrpc';
import { MAIN_RPC_CONTEXT } from '@theia/plugin-ext';
import { CommandEvent } from '@eclipse-che/plugin';
export class CheTelemetryImpl implements CheTelemetry {
    private readonly telemetryMain: CheTelemetryMain;
    // tslint:disable-next-line:no-any
    private readonly onWillExecuteCommandEmitter = new Emitter<CommandEvent>();
    readonly onWillExecuteCommand = this.onWillExecuteCommandEmitter.event;
    constructor(rpc: RPCProtocol) {
        this.telemetryMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY_MAIN);
        // tslint:disable-next-line:no-any
        this.overrideExecuteCommand((rpc as any).locals.get(MAIN_RPC_CONTEXT.COMMAND_REGISTRY_EXT.id));
    }
    async event(id: string, ownerId: string, properties: [string, string][]): Promise<void> {
        try {
            return await this.telemetryMain.$event(id, ownerId, properties);
        } catch (e) {
            return Promise.reject(e);
        }
    }
    overrideExecuteCommand(commandRegistryExt: CommandRegistryImpl) {
        const originalExecuteCommand = commandRegistryExt.executeCommand.bind(commandRegistryExt);
        // tslint:disable-next-line:no-any
        const executeCommand = (id: string, ...args: any[]) => {
            this.onWillExecuteCommandEmitter.fire({ commandId: id });
            return originalExecuteCommand(id, args);
        };
        commandRegistryExt.executeCommand = executeCommand;
    }
}
