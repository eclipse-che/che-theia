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
import { TelemetryListener, TelemetryListenerParam, ClientAddressInfo } from '@eclipse-che/plugin';
export class CheTelemetryImpl implements CheTelemetry {
    private readonly telemetryMain: CheTelemetryMain;
    private listeners: Map<string, TelemetryListener> = new Map();

    constructor(rpc: RPCProtocol) {
        this.telemetryMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY_MAIN);
    }
    async event(id: string, ownerId: string, properties: [string, string][]): Promise<void> {
        try {
            return await this.telemetryMain.$event(id, ownerId, properties);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async addCommandListener(commandId: string, listener: TelemetryListener): Promise<void> {
        this.listeners.set(commandId, listener);
    }

    async $onWillCommandExecute(commandId: string, params?: TelemetryListenerParam): Promise<void> {
        const listener = this.listeners.get(commandId);
        if (listener) {
            listener(commandId);
        }
    }

    async getClientAddressInfo(): Promise<ClientAddressInfo> {
        return this.telemetryMain.$getClientAddressInfo();
    }
}
