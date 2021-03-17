/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as jsYaml from 'js-yaml';
import * as k8s from '@kubernetes/client-node';

import {
  Devfile,
  DevfileComponentStatus,
  DevfileService,
} from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { inject, injectable } from 'inversify';

import { K8SServiceImpl } from './k8s-service-impl';
import { K8sDevWorkspaceEnvVariables } from './k8s-devworkspace-env-variables';
import { V1Pod } from '@kubernetes/client-node';

@injectable()
export class K8sDevfileServiceImpl implements DevfileService {
  @inject(K8SServiceImpl)
  private k8SService: K8SServiceImpl;

  @inject(K8sDevWorkspaceEnvVariables)
  private env: K8sDevWorkspaceEnvVariables;

  async getRaw(): Promise<string> {
    const devfile = await this.get();
    const devfileContent = jsYaml.safeDump(devfile);
    return devfileContent;
  }

  async get(): Promise<Devfile> {
    // Grab custom resource object
    const customObjectsApi = this.k8SService.makeApiClient(k8s.CustomObjectsApi);
    const group = 'workspace.devfile.io';
    const version = 'v1alpha2';
    const response = await customObjectsApi.getNamespacedCustomObject(
      group,
      version,
      this.env.getWorkspaceNamespace(),
      'devworkspaces',
      this.env.getWorkspaceName()
    );

    // devfile is stored inside the dev workspace inside spec.template object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devfile = (response.body as any).spec.template as Devfile;
    return devfile;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getWorkspaceRouting(): Promise<any> {
    // get workspace pod
    const group = 'controller.devfile.io';
    const version = 'v1alpha1';
    const customObjectsApi = this.k8SService.makeApiClient(k8s.CustomObjectsApi);
    const labelSelector = `controller.devfile.io/workspace_id=${this.env.getWorkspaceId()}`;
    const response = await customObjectsApi.listNamespacedCustomObject(
      group,
      version,
      this.env.getWorkspaceNamespace(),
      'workspaceroutings',
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaceRoutings: any = response.body;

    // check if we have items
    if (!workspaceRoutings.items) {
      throw new Error(
        `Got missing workspace routings objects when searching for objects with label selector ${labelSelector}`
      );
    }

    // ensure there is only one item
    if (!workspaceRoutings.items.length || workspaceRoutings.items.length !== 1) {
      throw new Error(
        `Got invalid items when searching for objects with label selector ${labelSelector}. Expected only one resource`
      );
    }

    return workspaceRoutings.items[0];
  }

  async getWorkspacePod(): Promise<V1Pod> {
    // get workspace pod
    const k8sCoreV1Api = this.k8SService.makeApiClient(k8s.CoreV1Api);
    const labelSelector = `controller.devfile.io/workspace_id=${this.env.getWorkspaceId()}`;
    const { body } = await k8sCoreV1Api.listNamespacedPod(
      this.env.getWorkspaceNamespace(),
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );

    // ensure there is only one item
    if (body.items.length !== 1) {
      throw new Error(
        `Got invalid items when searching for objects with label selector ${labelSelector}. Expected only one resource`
      );
    }

    return body.items[0];
  }

  async getComponentStatuses(): Promise<DevfileComponentStatus[]> {
    // grab workspace routing
    const workspaceRouting = await this.getWorkspaceRouting();

    // grab pod object
    const workspacePod = await this.getWorkspacePod();

    // get devfile
    // const devfile = await this.get();

    const componentStatuses: DevfileComponentStatus[] = [];

    // iterate over each container of the pod
    if (!workspacePod.spec) {
      return componentStatuses;
    }
    workspacePod.spec.containers.forEach(container => {
      // name
      const componentStatusName = container.name;

      // isUser or not
      // FIXME: find a right way of finding if it's coming or not from the devfile or added at runtime
      // for now, let's make it everything being user
      const isUser = true;

      // endpoints for this container
      const componentStatusEndpoints: {
        [endpointName: string]: {
          url?: string;
        };
      } = {};

      // add endpoints
      if (
        workspaceRouting.status &&
        workspaceRouting.status.exposedEndpoints &&
        workspaceRouting.status.exposedEndpoints[componentStatusName]
      ) {
        // search routing part for component name
        const endpoints = workspaceRouting.status.exposedEndpoints[componentStatusName];

        // endpoint contains something like:
        //   {
        //     "attributes": {
        //         "cookiesAuthEnabled": "true",
        //         "type": "ide"
        //     },
        //     "name": "theia",
        //     "url": "http://workspaceeb55021d3cff42e0-theia-3100.192.168.64.31.nip.io"
        // },
        Object.keys(endpoints).forEach(endpointKey => {
          const endpoint = endpoints[endpointKey];
          componentStatusEndpoints[endpoint.name] = { url: endpoint.url };
        });
      }
      componentStatuses.push({ isUser, name: componentStatusName, endpoints: componentStatusEndpoints });
    });
    return componentStatuses;
  }

  async updateDevfile(devfile: Devfile): Promise<void> {
    // Grab custom resource object
    const customObjectsApi = this.k8SService.makeApiClient(k8s.CustomObjectsApi);
    const group = 'workspace.devfile.io';
    const version = 'v1alpha2';

    const patch = [
      {
        op: 'replace',
        path: '/spec/template',
        value: devfile,
      },
    ];
    const options = {
      headers: {
        'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH,
      },
    };
    await customObjectsApi.patchNamespacedCustomObject(
      group,
      version,
      this.env.getWorkspaceNamespace(),
      'devworkspaces',
      this.env.getWorkspaceName(),
      patch,
      undefined,
      undefined,
      undefined,
      options
    );
  }
}
