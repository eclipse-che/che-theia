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

export class CheTelemetryMainImpl implements CheTelemetryMain {

    private readonly cheApiService: CheApiService;

    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        const proxy: CheTelemetry = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY);
        this.cheApiService = container.get(CheApiService);
        const commandRegistry = container.get(CommandRegistry);
        commandRegistry.onWillExecuteCommand(event => {
            console.log('------------------------------- will execute ' + event.commandId);
            proxy.$onWillCommandExecute(event.commandId);
        });
    }

    async $event(id: string, ownerId: string, properties: [string, string][]): Promise<void> {
        // TODO : get the infos from the browser
        const ip = '';

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

        return this.cheApiService.submitTelemetryEvent(id, ownerId, ip, agent, resolution, properties);
    }
}
