/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as k8s from '@kubernetes/client-node';

import {
  Devfile,
  DevfileComponentEnv,
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
    // get content of the file
    const devFilePath = this.env.getDevWorkspaceFlattenedDevfilePath();
    const devfileContent = await fs.readFile(devFilePath, 'utf-8');
    return devfileContent;
  }

  async get(): Promise<Devfile> {
    // get raw content
    const devfileRaw = await this.getRaw();
    return jsYaml.safeLoad(devfileRaw) as Devfile;
  }

  async getWorkspacePod(): Promise<V1Pod> {
    // get workspace pod
    const k8sCoreV1Api = this.k8SService.makeApiClient(k8s.CoreV1Api);
    const labelSelector = `controller.devfile.io/devworkspace_id=${this.env.getWorkspaceId()}`;
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
    // grab pod object
    const workspacePod = await this.getWorkspacePod();

    // get devfile
    const devfile = await this.get();

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
      const matchingContainerComponent = devfile.components?.find(
        itComponent => itComponent.name === componentStatusName && itComponent.container
      );
      const matchingContainerComponentEndpoints = matchingContainerComponent?.container?.endpoints;
      if (matchingContainerComponentEndpoints) {
        // endpoint contains something like:
        // - attributes:
        //     controller.devfile.io/endpoint-url: http://workspace1105c7bcbe794da5-theia-3100.192.168.64.53.nip.io
        //     type: main
        //   exposure: public
        //   name: theia
        //   protocol: http
        //   secure: true
        //   targetPort: 3100
        matchingContainerComponentEndpoints.forEach(endpoint => {
          componentStatusEndpoints[endpoint.name] = {
            url: endpoint.attributes?.['controller.devfile.io/endpoint-url'],
          };
        });
      }
      const env: DevfileComponentEnv[] | undefined = container.env?.map(envItem => ({
        name: envItem.name,
        value: envItem.value || '',
      }));
      componentStatuses.push({
        isUser,
        name: componentStatusName,
        env,
        endpoints: componentStatusEndpoints,
      });
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
