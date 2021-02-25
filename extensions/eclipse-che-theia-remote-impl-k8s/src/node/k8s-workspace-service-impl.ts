/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
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

import { DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';

@injectable()
export class K8sWorkspaceServiceImpl implements WorkspaceService {
  @inject(DevfileService)
  private devfileService: DevfileService;

  /**
   * workspaceId - workspace ID taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceId: string;

  /**
   * workspaceName - workspace name taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceName: string;

  /**
   * workspaceNamespace - workspace namespace taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceNamespace: string;

  constructor() {
    if (process.env.DEVWORKSPACE_ID === undefined) {
      console.error('Environment variable DEVWORKSPACE_ID is not set');
    } else {
      this.workspaceId = process.env.DEVWORKSPACE_ID;
    }
    if (process.env.DEVWORKSPACE_NAMESPACE === undefined) {
      console.error('Environment variable DEVWORKSPACE_NAMESPACE is not set');
    } else {
      this.workspaceNamespace = process.env.DEVWORKSPACE_NAMESPACE;
    }
    if (process.env.DEVWORKSPACE_NAME === undefined) {
      console.error('Environment variable DEVWORKSPACE_NAME is not set');
    } else {
      this.workspaceName = process.env.DEVWORKSPACE_NAME;
    }
  }

  public async getCurrentNamespace(): Promise<string> {
    return this.workspaceNamespace;
  }

  public async getCurrentWorkspaceId(): Promise<string> {
    return this.workspaceId;
  }

  public async currentWorkspace(): Promise<Workspace> {
    return {
      id: this.workspaceId,
      name: this.workspaceName,
      namespace: this.workspaceNamespace,
      // running as we're in the pod
      status: 'RUNNING',
    };
  }

  public async getWorkspaceById(workspaceId: string): Promise<Workspace> {
    throw new Error('workspaceService.getWorkspaceById() not supported');
  }

  public async getAll(userToken?: string): Promise<Workspace[]> {
    throw new Error('workspaceService.getAll() not supported');
  }

  public async getAllByNamespace(namespace: string, userToken?: string): Promise<Workspace[]> {
    throw new Error(`workspaceService.getAllByNamespace(${namespace}) not supported`);
  }

  public async updateWorkspace(workspaceId: string, workspace: Workspace): Promise<Workspace> {
    throw new Error(`workspaceService.updateWorkspace(${workspaceId}) not supported`);
  }

  public async updateWorkspaceActivity(): Promise<void> {
    throw new Error('workspaceService.updateWorkspaceActivity() not supported');
  }

  public async stop(): Promise<void> {
    // stopping the workspace is changing the state to false
    throw new Error('workspaceService.stop() not supported');
  }

  public async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    console.log('workspaceService.getWorkspaceSettings() not supported');
    return {};
  }

  public async getContainerList(): Promise<Container[]> {
    const containers: Container[] = [];
    try {
      const devfile = await this.devfileService.get();
      (devfile.components || []).forEach(component => {
        if (component.container && component.name) {
          const container: Container = { name: component.name };
          containers.push(container);
        }
      });
    } catch (e) {
      throw new Error('Unable to get the list of workspace containers. Cause: ' + e);
    }

    return containers;
  }
}
