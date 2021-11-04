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

import { CheEndpointMain } from '../common/che-protocol';
import { interfaces } from 'inversify';

export class CheEndpointMainImpl implements CheEndpointMain {
  private readonly endpointService: EndpointService;

  constructor(container: interfaces.Container) {
    this.endpointService = container.get(EndpointService);
  }

  async $getEndpoints(): Promise<ComponentExposedEndpoint[]> {
    return this.endpointService.getEndpoints();
  }
  async $getEndpointsByName(...names: string[]): Promise<ExposedEndpoint[]> {
    return this.endpointService.getEndpointsByName(...names);
  }
  async $getEndpointsByType(type: string): Promise<ExposedEndpoint[]> {
    return this.endpointService.getEndpointsByType(type);
  }
}
