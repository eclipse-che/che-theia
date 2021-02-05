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
  Container,
  Endpoint,
  Workspace,
  WorkspaceService,
  WorkspaceSettings,
} from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';

const TYPE: string = 'type';
const EDITOR_SERVER_TYPE: string = 'ide';

@injectable()
export class CheServerWorkspaceServiceImpl implements WorkspaceService {
  @inject(CheServerRemoteApiImpl)
  private cheServerRemoteApiImpl: CheServerRemoteApiImpl;

  /**
   * Workspace client based variables.
   *
   * workspaceId - workspace ID taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceId: string;

  constructor() {
    if (process.env.CHE_WORKSPACE_ID === undefined) {
      console.error('Environment variable CHE_WORKSPACE_ID is not set');
    } else {
      this.workspaceId = process.env.CHE_WORKSPACE_ID;
    }
  }

  public async getCurrentWorkspaceId(): Promise<string> {
    return this.workspaceId;
  }

  public async currentWorkspace(): Promise<Workspace> {
    return this.cheServerRemoteApiImpl.getAPI().getById<Workspace>(this.workspaceId);
  }

  public async getWorkspaceById(workspaceId: string): Promise<Workspace> {
    return this.cheServerRemoteApiImpl.getAPI().getById(this.workspaceId);
  }

  public async getAll(userToken?: string): Promise<Workspace[]> {
    return this.cheServerRemoteApiImpl.getAPI(userToken).getAll();
  }

  public async getAllByNamespace(namespace: string, userToken?: string): Promise<Workspace[]> {
    return this.cheServerRemoteApiImpl.getAPI(userToken).getAllByNamespace(namespace);
  }

  public async updateWorkspace(workspaceId: string, workspace: Workspace): Promise<Workspace> {
    return this.cheServerRemoteApiImpl.getAPI().update(workspaceId, workspace);
  }

  public async updateWorkspaceActivity(): Promise<void> {
    return this.cheServerRemoteApiImpl.getAPI().updateActivity(this.workspaceId);
  }

  public async stop(): Promise<void> {
    return this.cheServerRemoteApiImpl.getAPI().stop(this.workspaceId);
  }

  public async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    return this.cheServerRemoteApiImpl.getAPI().getSettings();
  }

  public async getCurrentWorkspacesContainers(): Promise<{ [key: string]: Container }> {
    const result: { [key: string]: Container } = {};
    try {
      const workspace = await this.currentWorkspace();
      const containers = workspace.runtime!.machines;
      if (containers) {
        for (const containerName of Object.keys(containers)) {
          const container: Container = { name: containerName, ...containers[containerName] };
          container.name = containerName;
          if (container) {
            result[containerName] = container;
          }
        }
      }
    } catch (e) {
      throw new Error(`Unable to get workspace containers. Cause: ${e}`);
    }
    return result;
  }

  public async findUniqueEndpointByAttribute(attributeName: string, attributeValue: string): Promise<Endpoint> {
    const containers = await this.getCurrentWorkspacesContainers();
    try {
      if (containers) {
        for (const containerName of Object.keys(containers)) {
          const servers = containers[containerName].servers;
          if (servers) {
            for (const serverName of Object.keys(servers)) {
              const server = servers[serverName];
              if (server && server.attributes && server.attributes[attributeName] === attributeValue) {
                return server;
              }
            }
          }
        }
      }
      return Promise.reject(`Server by attributes '${attributeName}'='${attributeValue}' was not found.`);
    } catch (e) {
      return Promise.reject(`Unable to get workspace servers. Cause: ${e}`);
    }
  }

  public async getContainerList(): Promise<Container[]> {
    const containers: Container[] = [];
    try {
      const workspace = await this.currentWorkspace();

      if (workspace.runtime && workspace.runtime.machines) {
        const machines = workspace.runtime.machines;
        for (const machineName in machines) {
          if (!machines.hasOwnProperty(machineName)) {
            continue;
          }
          const machine = workspace.runtime.machines[machineName];
          const container: Container = { name: machineName, ...machine };
          containers.push(container);
        }
      }
    } catch (e) {
      throw new Error('Unable to get list workspace containers. Cause: ' + e);
    }

    return containers;
  }

  public async findTerminalServer(): Promise<Endpoint | undefined> {
    const containers = await this.getContainerList();

    for (const container of containers) {
      const servers = container.servers || {};
      for (const serverName in servers) {
        if (!servers.hasOwnProperty(serverName)) {
          continue;
        }
        const attrs = servers[serverName].attributes || {};

        for (const attrName in attrs) {
          if (attrName === TYPE && attrs[attrName] === 'terminal') {
            return servers[serverName];
          }
        }
      }
    }

    return undefined;
  }

  public async findEditorContainer(): Promise<string | undefined> {
    const containers = await this.getContainerList();

    for (const container of containers) {
      const servers = container.servers || {};
      for (const serverName in servers) {
        if (!servers.hasOwnProperty(serverName)) {
          continue;
        }
        const attrs = servers[serverName].attributes || {};
        for (const attrName in attrs) {
          if (attrName === TYPE && attrs[attrName] === EDITOR_SERVER_TYPE) {
            return container.name;
          }
        }
      }
    }

    return undefined;
  }
}
