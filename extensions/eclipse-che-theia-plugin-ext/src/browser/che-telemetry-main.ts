/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { interfaces } from 'inversify';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { CheTelemetryMain, PLUGIN_RPC_CONTEXT, CheTelemetry } from '../common/che-protocol';
import { CheApiService } from '../common/che-protocol';
import { CommandRegistry } from '@theia/core';
import * as axios from 'axios';
import { ClientAddressInfo } from '@eclipse-che/plugin';

export class CheTelemetryMainImpl implements CheTelemetryMain {

    private readonly cheApiService: CheApiService;
    private ip: string;

    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        const proxy: CheTelemetry = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY);
        this.cheApiService = container.get(CheApiService);
        const commandRegistry = container.get(CommandRegistry);
        commandRegistry.onWillExecuteCommand(event => {
            proxy.$onWillCommandExecute(event.commandId);
        });
    }

    async $event(id: string, ownerId: string, properties: [string, string][]): Promise<void> {
        if (!this.ip) {
            const client = await this.getClientAddressInfo();
            this.ip = client.ip !== undefined ? client.ip : '';
        }
        let agent = '';
        let resolution = '';
        const navigator = window.navigator;
        if (navigator) {
            agent = navigator.userAgent;
        }
        const screen = window.screen;
        if (screen) {
            const width = screen.width;
            const height = screen.height;
            if (height && width) {
                resolution = '' + width + 'x' + height;
            }
        }

        return this.cheApiService.submitTelemetryEvent(id, ownerId, this.ip, agent, resolution, properties);
    }

    async $getClientAddressInfo(): Promise<ClientAddressInfo> {
        return this.getClientAddressInfo();
    }

    async getClientAddressInfo(): Promise<ClientAddressInfo> {
        const response = await axios.default.get('/che/client-ip');
        if (response.status === 200) {
            return response.data;
        }
        console.log('Can`t obtain client adress information. Status: ' + response.status + 'Error message: ' + response.data);
        return {
            ip: undefined,
            ipFamily: undefined,
            port: undefined
        };
    }
}
