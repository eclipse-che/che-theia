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
    const devfile = await this.k8sDevfileService.get();

    const containerComponents = (devfile.components || []).filter(
      component => component.container && component.container.endpoints
    );

    containerComponents.forEach(component => {
      const endpoints: ExposedEndpoint[] = [];
      if (component.container?.endpoints) {
        component.container.endpoints.forEach(endpoint => {
          const componentExposedEndpoint: ExposedEndpoint = {
            attributes: endpoint.attributes,
            name: endpoint.name,
            component: component.name || '',
            targetPort: endpoint.targetPort.toString(),
            url: endpoint.attributes?.['controller.devfile.io/endpoint-url'],
          };
          endpoints.push(componentExposedEndpoint);
        });
      }
      componentExposedEndpoints.push({ name: component.name || '', endpoints });
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
