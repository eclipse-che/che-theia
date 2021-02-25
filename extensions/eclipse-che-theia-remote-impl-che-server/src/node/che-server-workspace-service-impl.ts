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
  Workspace,
  WorkspaceService,
  WorkspaceSettings,
} from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';

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
      throw new Error('Unable to get list of workspace containers. Cause: ' + e);
    }

    return containers;
  }
}
