/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';

import { DevfileHandler } from './devfile-handler';
import { Endpoint } from './endpoint';
import { EndpointCategory } from './endpoint-category';
import { EndpointExposure } from './endpoint-exposure';

/**
 * Handle endpoints retrieval for DevWorkspaces.
 * It filters all container endpoints and then check if there are some attributes to know if it's user or plug-ins side
 * @author Florent Benoit
 */
interface DevfileContainerComponentWithComponentAttributes extends che.devfile.DevfileContainerComponent {
  componentAttributes: { [attributeName: string]: string };
}

interface DevfileComponentEndpointWithComponentAttributes extends che.devfile.DevfileComponentEndpoint {
  componentAttributes: { [attributeName: string]: string };
}

export class DevWorkspaceDevfileHandlerImpl implements DevfileHandler {
  async getEndpoints(): Promise<Array<Endpoint>> {
    const devfile = await che.devfile.get();
    const containerComponents: DevfileContainerComponentWithComponentAttributes[] =
      devfile.components
        ?.filter(component => component.container)
        .map(
          component =>
            ({
              ...component.container,
              componentAttributes: component.attributes,
            } as DevfileContainerComponentWithComponentAttributes)
        ) || [];

    const devfileEndpoints: DevfileComponentEndpointWithComponentAttributes[] = containerComponents
      .map(container =>
        (container.endpoints || []).map(endpoint => ({
          ...endpoint,
          componentAttributes: container.componentAttributes,
        }))
      )
      .reduce((acc, val) => acc.concat(val), []);

    const endpoints = devfileEndpoints.map(exposedEndpoint => {
      let exposure: EndpointExposure;
      if (exposedEndpoint.exposure === 'public') {
        exposure = EndpointExposure.FROM_DEVFILE_PUBLIC;
      } else if (exposedEndpoint.exposure === 'internal') {
        exposure = EndpointExposure.FROM_DEVFILE_PRIVATE;
      } else {
        exposure = EndpointExposure.FROM_DEVFILE_NONE;
      }

      // category ? is is part of eclipse che-theia
      let category;
      const isPartOfCheTheia =
        exposedEndpoint.componentAttributes?.['app.kubernetes.io/part-of'] === 'che-theia.eclipse.org';
      if (isPartOfCheTheia) {
        category = EndpointCategory.PLUGINS;
      } else {
        category = EndpointCategory.USER;
      }
      return {
        name: exposedEndpoint.name,
        category,
        exposure,
        protocol: exposedEndpoint.protocol,
        url: exposedEndpoint.attributes?.['controller.devfile.io/endpoint-url'],
        targetPort: exposedEndpoint.targetPort,
      } as Endpoint;
    });

    // Add private JWT proxy ports
    const jwtProxyEnv: string[] = Object.keys(process.env).filter(key =>
      key.includes('_JWTPROXY_SERVICE_PORT_SERVER_')
    );
    jwtProxyEnv.forEach((key, index) => {
      const value = process.env[key]!.toLocaleLowerCase() || '';
      const port = parseInt(value);
      if (!isNaN(port)) {
        const endpoint: Endpoint = {
          name: `jwt-proxy-${index + 1}`,
          exposure: EndpointExposure.FROM_DEVFILE_PRIVATE,
          url: '',
          targetPort: port,
          protocol: 'tcp',
          type: 'jwt-proxy',
          category: EndpointCategory.PLUGINS,
        };
        endpoints.push(endpoint);
      }
    });

    // Theia sidecar remote endpoint
    [2503, 2504].forEach(port => {
      endpoints.push({
        name: 'theia-sidecar-endpoint',
        exposure: EndpointExposure.FROM_DEVFILE_PRIVATE,
        url: '',
        targetPort: port,
        protocol: 'tcp',
        type: 'theia-endpoint',
        category: EndpointCategory.PLUGINS,
      });
    });

    return endpoints;
  }
}
