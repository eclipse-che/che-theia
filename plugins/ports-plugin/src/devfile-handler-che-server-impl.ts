/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';

import { CommandPreviewUrl, DevfileHandler } from './devfile-handler';

import { Endpoint } from './endpoint';
import { EndpointCategory } from './endpoint-category';
import { EndpointExposure } from './endpoint-exposure';

/**
 * Grab endpoints from a devfile.
 * @author Florent Benoit
 */

export class CheServerDevfileHandlerImpl implements DevfileHandler {
  async getEndpoints(): Promise<Array<Endpoint>> {
    const workspace = await che.workspace.getCurrentWorkspace();

    const endpoints: Endpoint[] = [];
    if (!workspace) {
      return endpoints;
    }

    const previewUrls: CommandPreviewUrl[] = [];
    if (workspace.devfile && workspace.devfile.commands) {
      const commands = workspace.devfile.commands;
      for (const command of commands) {
        if (command.previewUrl && command.previewUrl.port) {
          previewUrls.push({ port: command.previewUrl.port, path: command.previewUrl.path });
        }
      }
    }
    // the current workspace runtime is there (or theia would not be alive)
    const runtimeMachines = workspace.runtime!.machines || {};
    Object.keys(runtimeMachines).forEach((machineName: string) => {
      const attributes = runtimeMachines[machineName].attributes || {};
      let fromPlugin: string;
      if (attributes.plugin) {
        fromPlugin = attributes.plugin;
      }
      const machineServers = runtimeMachines[machineName].servers || {};
      Object.keys(machineServers).forEach((name: string) => {
        const url = machineServers[name].url;
        const machineServerAttributes = machineServers[name].attributes || {};
        const targetPort = parseInt(machineServerAttributes.port);
        const previewUrl = previewUrls.find(previewUrlData => previewUrlData.port === targetPort);
        const secure = machineServerAttributes.secure;
        const internal = machineServerAttributes.internal;
        let protocol;
        if (url) {
          const tmpURL = new URL(url);
          protocol = tmpURL.protocol.slice(0, -1);
        } else {
          protocol = 'N/A';
        }
        const type = machineServerAttributes.type;
        const secured = 'true' === secure;
        const isInternal = 'true' === internal;
        let exposure;
        if (isInternal) {
          exposure = EndpointExposure.FROM_DEVFILE_PRIVATE;
        } else {
          exposure = EndpointExposure.FROM_DEVFILE_PUBLIC;
        }
        let path;
        if (previewUrl && previewUrl.path) {
          path = previewUrl.path;
        }
        let category;
        if (fromPlugin) {
          category = EndpointCategory.PLUGINS;
        } else {
          category = EndpointCategory.USER;
        }

        const endpoint: Endpoint = {
          name,
          exposure,
          url,
          secured,
          targetPort,
          protocol,
          path,
          type,
          category,
        };
        endpoints.push(endpoint);
      });
    });

    // add private endpoints
    const devFileComponents = workspace.devfile!.components || [];
    devFileComponents.forEach(component => {
      let isFromPlugin: boolean;
      if (component.type === 'chePlugin' || component.type === 'cheEditor') {
        isFromPlugin = true;
      } else {
        isFromPlugin = false;
      }
      if (component.endpoints) {
        component.endpoints.forEach(componentEndpoint => {
          const name = componentEndpoint.name!;
          const componentAttributes = componentEndpoint.attributes || {};
          const publicAttribute = componentAttributes.public;
          const targetPort = componentEndpoint.port!;
          let protocol = componentAttributes.protocol;
          if (!protocol) {
            protocol = 'N/A';
          }
          const type = componentAttributes.type!;
          const notPublic = 'false' === publicAttribute;
          let category;
          if (isFromPlugin) {
            category = EndpointCategory.PLUGINS;
          } else {
            category = EndpointCategory.USER;
          }
          let path;
          if (componentAttributes.path) {
            path = componentAttributes.path;
          }
          if (notPublic) {
            const endpoint: Endpoint = {
              name,
              exposure: EndpointExposure.FROM_DEVFILE_PRIVATE,
              url: 'N/A',
              targetPort,
              protocol,
              path,
              type,
              category,
            };
            endpoints.push(endpoint);
          }
        });
      }
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

    // FIXME: Theia plug-in should register these endpoints
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

    // FIXME: Telemetry plug-in should register these endpoints
    // Telemetry
    if (process.env.CHE_WORKSPACE_TELEMETRY_BACKEND_PORT) {
      const telemetryPort = parseInt(process.env.CHE_WORKSPACE_TELEMETRY_BACKEND_PORT);
      endpoints.push({
        name: 'telemetry',
        exposure: EndpointExposure.FROM_DEVFILE_PRIVATE,
        url: '',
        targetPort: telemetryPort,
        protocol: 'tcp',
        type: 'telemetry',
        category: EndpointCategory.PLUGINS,
      });
    }

    // remove duplicates when name+port+exposure is the same
    return endpoints.filter(
      (endpoint: Endpoint, index: number, arrayEndpoints: Endpoint[]) =>
        arrayEndpoints.findIndex(
          indexedEndpoint =>
            indexedEndpoint.name === endpoint.name &&
            indexedEndpoint.targetPort === endpoint.targetPort &&
            indexedEndpoint.exposure === endpoint.exposure
        ) === index
    );
  }
}
