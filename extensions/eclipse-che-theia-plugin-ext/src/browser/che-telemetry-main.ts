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
import { SERVER_IDE_ATTR_VALUE, SERVER_TYPE_ATTR } from '../common/che-server-common';

import { ClientAddressInfo } from '@eclipse-che/plugin';
import { CommandRegistry } from '@theia/core';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { TelemetryService } from '@eclipse-che/theia-remote-api/lib/common/telemetry-service';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { interfaces } from 'inversify';

export class CheTelemetryMainImpl implements CheTelemetryMain {
  private readonly telemetryService: TelemetryService;
  private readonly workspaceService: WorkspaceService;
  private ip: string;

  constructor(container: interfaces.Container, rpc: RPCProtocol) {
    const proxy: CheTelemetry = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TELEMETRY);
    this.telemetryService = container.get(TelemetryService);
    const commandRegistry = container.get(CommandRegistry);
    this.workspaceService = container.get(WorkspaceService);
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
    const ideEndpoint = await this.workspaceService.findUniqueEndpointByAttribute(
      SERVER_TYPE_ATTR,
      SERVER_IDE_ATTR_VALUE
    );
    if (ideEndpoint && ideEndpoint.url) {
      const ipServiceURL = new URI(ideEndpoint.url).resolve('che/client-ip').toString();
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
