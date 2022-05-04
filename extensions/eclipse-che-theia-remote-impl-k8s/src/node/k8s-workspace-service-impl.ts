/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as k8s from '@kubernetes/client-node';

import {
  Container,
  Workspace,
  WorkspaceService,
  WorkspaceSettings,
} from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject, injectable } from 'inversify';

import { DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { HttpService } from '@eclipse-che/theia-remote-api/lib/common/http-service';
import { K8SServiceImpl } from './k8s-service-impl';
import { K8sDevWorkspaceEnvVariables } from './k8s-devworkspace-env-variables';

@injectable()
export class K8sWorkspaceServiceImpl implements WorkspaceService {
  @inject(K8SServiceImpl)
  private k8SService: K8SServiceImpl;

  @inject(DevfileService)
  private devfileService: DevfileService;

  @inject(K8sDevWorkspaceEnvVariables)
  private env: K8sDevWorkspaceEnvVariables;

  @inject(EndpointService)
  private endpointService: EndpointService;

  @inject(HttpService)
  private httpService: HttpService;

  public async getCurrentNamespace(): Promise<string> {
    return this.env.getWorkspaceNamespace();
  }

  public async getCurrentWorkspaceId(): Promise<string> {
    return this.env.getWorkspaceId();
  }

  public async currentWorkspace(): Promise<Workspace> {
    return {
      id: this.env.getWorkspaceId(),
      name: this.env.getWorkspaceName(),
      namespace: this.env.getWorkspaceNamespace(),
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
    const endpoints = await this.endpointService.getEndpointsByType('collocated-terminal');
    const machineExecEndpoint = endpoints.find(endpoint => endpoint.name === 'terminal');

    if (machineExecEndpoint === undefined || machineExecEndpoint.targetPort === undefined) {
      throw new Error('Endpoint for machine-exec did not found.');
    }

    const requestUrl = `http://127.0.0.1:${machineExecEndpoint.targetPort}/activity/tick`;
    await this.httpService.post(requestUrl);
  }

  public async stop(): Promise<void> {
    // stopping the workspace is changing the started state to false

    const customObjectsApi = this.k8SService.makeApiClient(k8s.CustomObjectsApi);
    const group = 'workspace.devfile.io';
    const version = 'v1alpha2';
    const namespace = this.env.getWorkspaceNamespace();
    const plural = 'devworkspaces';
    const name = this.env.getWorkspaceName();
    const patch = [
      {
        op: 'replace',
        path: '/spec/started',
        value: false,
      },
    ];

    const options = { headers: { 'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH } };
    await customObjectsApi.patchNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      name,
      patch,
      undefined,
      undefined,
      undefined,
      options
    );
  }

  public async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    return {
      cheWorkspacePluginRegistryUrl: this.env.getPluginRegistryURL(),
      cheWorkspacePluginRegistryInternalUrl: this.env.getPluginRegistryInternalURL(),
    };
  }

  public async getContainerList(): Promise<Container[]> {
    const containers: Container[] = [];
    try {
      const devfile = await this.devfileService.get();
      (devfile.components || []).forEach(component => {
        if (component.container && component.name) {
          const container: Container = { name: component.name, attributes: component.attributes };
          containers.push(container);
        }
      });
    } catch (e) {
      throw new Error('Unable to get the list of workspace containers. Cause: ' + e);
    }

    return containers;
  }

  /**
   * Provides the root directory like /projects
   */
  async getProjectsRootDirectory(): Promise<string> {
    return this.env.getProjectsRoot();
  }
}
