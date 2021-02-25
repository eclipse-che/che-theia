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
  ComponentExposedEndpoint,
  EndpointService,
  ExposedEndpoint,
} from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { inject, injectable } from 'inversify';

import { K8sDevfileServiceImpl } from './k8s-devfile-service-impl';

@injectable()
export class K8sEndpointServiceImpl implements EndpointService {
  @inject(K8sDevfileServiceImpl)
  private k8sDevfileService: K8sDevfileServiceImpl;

  async getEndpoints(): Promise<ComponentExposedEndpoint[]> {
    const componentExposedEndpoints: ComponentExposedEndpoint[] = [];
    const workspaceRouting = await this.k8sDevfileService.getWorkspaceRouting();

    const specComponentEndpoints = workspaceRouting.spec.endpoints;
    const statusComponentExposedEndpoints = workspaceRouting.status.exposedEndpoints;

    Object.keys(specComponentEndpoints).forEach(componentName => {
      const endpoints: ExposedEndpoint[] = [];
      const specComponentEndpointList = specComponentEndpoints[componentName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      specComponentEndpointList.forEach((specEndpoint: any) => {
        // search url from the status/exposedEndpoints part
        let statusExposedEndpointUrl;
        const statusComponentExposedEndpoint = statusComponentExposedEndpoints[componentName];
        let attributes;
        if (specEndpoint.attributes) {
          attributes = specEndpoint.attributes;
        }

        if (statusComponentExposedEndpoint) {
          const statusExposedEndpoint = statusComponentExposedEndpoint.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sub: any) => sub.name === specEndpoint.name
          );
          statusExposedEndpointUrl = statusExposedEndpoint?.url;
        }

        const componentExposedEndpoint = {
          attributes,
          name: specEndpoint.name,
          component: componentName,
          url: statusExposedEndpointUrl,
        };
        endpoints.push(componentExposedEndpoint);
      });
      componentExposedEndpoints.push({ name: componentName, endpoints });
    });
    return componentExposedEndpoints;
  }

  async getEndpointsByName(...names: string[]): Promise<ExposedEndpoint[]> {
    let exposedEndpoints: ExposedEndpoint[] = [];
    const all = await this.getEndpoints();
    all.forEach(componentEndpoint => {
      const endpoints = componentEndpoint.endpoints;
      const filteredEndpoints = endpoints.filter(endpoint => names.includes(endpoint.name));
      exposedEndpoints = exposedEndpoints.concat(filteredEndpoints);
    });
    return exposedEndpoints;
  }

  async getEndpointsByType(type: string): Promise<ExposedEndpoint[]> {
    let exposedEndpoints: ExposedEndpoint[] = [];
    const all = await this.getEndpoints();
    all.forEach(componentEndpoint => {
      const endpoints = componentEndpoint.endpoints;
      const filteredEndpoints = endpoints.filter(endpoint => endpoint.attributes && endpoint.attributes.type === type);
      exposedEndpoints = exposedEndpoints.concat(filteredEndpoints);
    });
    return exposedEndpoints;
  }
}
