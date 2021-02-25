/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as axios from 'axios';

import { CheTelemetry, CheTelemetryMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

import { ClientAddressInfo } from '@eclipse-che/plugin';
import { CommandRegistry } from '@theia/core';
import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { SERVER_IDE_ATTR_VALUE } from '../common/che-server-common';
import { TelemetryService } from '@eclipse-che/theia-remote-api/lib/common/telemetry-service';
import URI from '@theia/core/lib/common/uri';
import { interfaces } from 'inversify';

export class CheTelemetryMainImpl implements CheTelemetryMain {
  private readonly telemetryService: TelemetryService;
  private readonly endpointService: EndpointService;
  private ip: string;

  constructor(container: interfaces.Container, rpc: RPCProtocol) {
    const proxy: CheTelemetry = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY);
    this.telemetryService = container.get(TelemetryService);
    const commandRegistry = container.get(CommandRegistry);
    this.endpointService = container.get(EndpointService);
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

    return this.telemetryService.submitTelemetryEvent(id, ownerId, this.ip, agent, resolution, properties);
  }

  async $getClientAddressInfo(): Promise<ClientAddressInfo> {
    return this.getClientAddressInfo();
  }

  async getClientAddressInfo(): Promise<ClientAddressInfo> {
    const ideEndpoints = await this.endpointService.getEndpointsByType(SERVER_IDE_ATTR_VALUE);

    if (ideEndpoints.length === 1) {
      const ipServiceURL = new URI(ideEndpoints[0].url).resolve('che/client-ip').toString();
      const response = await axios.default.get(ipServiceURL);
      if (response.status === 200) {
        return response.data;
      }
      console.log(
        `Can\`t obtain client address information. Status: ${response.status} Error message: ${response.data}`
      );
    } else {
      console.log('Can`t obtain client address information.');
    }
    return {
      ip: undefined,
      ipFamily: undefined,
      port: undefined,
    };
  }
}
