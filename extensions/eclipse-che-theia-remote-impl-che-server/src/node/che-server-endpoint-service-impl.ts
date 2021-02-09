/**********************************************************************
 * Copyright (c) 2020-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  ComponentExposedEndpoint,
  EndpointService,
  ExposedEndpoint,
} from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { inject, injectable } from 'inversify';

import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

@injectable()
export class CheServerEndpointServiceImpl implements EndpointService {
  getEndpoints(): Promise<ComponentExposedEndpoint[]> {
    throw new Error('Method not implemented.');
  }

  @inject(WorkspaceService)
  private workspaceService: WorkspaceService;

  async getEndpointsByName(...names: string[]): Promise<ExposedEndpoint[]> {
    const workspace = await this.workspaceService.currentWorkspace();
    if (!workspace.runtime) {
      throw new Error('Workspace is not running.');
    }

    const endpoints: ExposedEndpoint[] = [];
    const machines = workspace.runtime.machines!;
    for (const machineName in machines) {
      if (!machines.hasOwnProperty(machineName)) {
        continue;
      }
      const servers = machines[machineName].servers!;
      for (const serverName in servers) {
        if (!servers.hasOwnProperty(serverName)) {
          continue;
        }
        if (names.includes(serverName)) {
          const server = servers[serverName];
          endpoints.push({
            url: server.url,
            attributes: server.attributes,
            name: serverName,
            component: machineName,
          });
        }
      }
    }
    return endpoints;
  }

  async getEndpointsByType(type: string): Promise<ExposedEndpoint[]> {
    const workspace = await this.workspaceService.currentWorkspace();
    if (!workspace.runtime) {
      throw new Error('Workspace is not running.');
    }

    const endpoints: ExposedEndpoint[] = [];
    const machines = workspace.runtime.machines!;
    for (const machineName in machines) {
      if (!machines.hasOwnProperty(machineName)) {
        continue;
      }
      const servers = machines[machineName].servers!;
      for (const serverName in servers) {
        if (!servers.hasOwnProperty(serverName)) {
          continue;
        }
        const server = servers[serverName];
        if (server.attributes && server.attributes['type'] === type) {
          endpoints.push({
            url: server.url,
            attributes: server.attributes,
            name: serverName,
            component: machineName,
          });
        }
      }
    }
    return endpoints;
  }
}
