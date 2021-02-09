/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export const cheEndpointServicePath = '/services/che-endpoint-service';

export const EndpointService = Symbol('EndpointService');

export interface ExposedEndpoint {
  attributes?: { [key: string]: string };
  url?: string;
  name: string;
  component: string;
}

export interface ComponentExposedEndpoint {
  name: string;
  endpoints: ExposedEndpoint[];
}

export interface EndpointService {
  getEndpoints(): Promise<ComponentExposedEndpoint[]>;
  getEndpointsByName(...names: string[]): Promise<ExposedEndpoint[]>;
  getEndpointsByType(type: string): Promise<ExposedEndpoint[]>;
}
