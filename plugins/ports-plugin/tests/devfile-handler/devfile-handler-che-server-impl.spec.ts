/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs';

import { CheServerDevfileHandlerImpl } from '../../src/devfile-handler-che-server-impl';
import { DevfileHandler } from '../../src/devfile-handler';
import { EndpointCategory } from '../../src/endpoint-category';
import { EndpointExposure } from '../../src/endpoint-exposure';

describe('Test Workspace Endpoints', () => {
  let devfileHandler: DevfileHandler;

  const OLD_ENV = process.env;

  beforeEach(() => {
    devfileHandler = new CheServerDevfileHandlerImpl();
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('test fail workspace', async () => {
    const endpoints = await devfileHandler.getEndpoints();
    expect(endpoints).toBeDefined();
    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBe(0);
  });

  test('test ports opened', async () => {
    const output = fs.readFileSync(__dirname + '/workspace-output.json');

    (che as any).setWorkspaceOutput(output);

    // jwt proxy
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4401 = '4401';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4400 = '4400';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4402 = '4402';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_EMPTY = '';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_INVALID = 'invalid';

    // telemetry
    process.env.CHE_WORKSPACE_TELEMETRY_BACKEND_PORT = '4167';

    const endpoints = await devfileHandler.getEndpoints();

    expect(endpoints).toBeDefined();
    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBe(14);

    expect(endpoints[0].targetPort).toBe(4444);
    expect(endpoints[0].url).toBe('wss://routewxrk0x26-dummy-che.8a09.starter-us-east-2.openshiftapps.com');
    expect(endpoints[0].name).toBe('che-machine-exec');

    // check we have JTW proxy endpoints
    const jwtEndpoints = endpoints.filter(endpoint => endpoint.type === 'jwt-proxy');
    expect(jwtEndpoints.length).toBe(3);
    jwtEndpoints.forEach(jwtEndpoint => {
      expect(jwtEndpoint.category).toBe(EndpointCategory.PLUGINS);
      expect(jwtEndpoint.exposure).toBe(EndpointExposure.FROM_DEVFILE_PRIVATE);
      expect(jwtEndpoint.url).toBe('');
      expect(jwtEndpoint.protocol).toBe('tcp');
      expect(jwtEndpoint.url).toBe('');
    });
  });

  test('test quarkus workspace', async () => {
    const output = fs.readFileSync(__dirname + '/workspace-quarkus.json');
    (che as any).setWorkspaceOutput(output);

    const endpoints = await devfileHandler.getEndpoints();

    // check that quarkus debug port is private
    const result = endpoints.filter(endpoint => endpoint.name === 'quarkus-debug');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBe(1);
    const quarkusEndpoint = result[0];
    expect(quarkusEndpoint.targetPort).toBe(5005);
    expect(quarkusEndpoint.exposure).toBe(EndpointExposure.FROM_DEVFILE_PRIVATE);
    expect(quarkusEndpoint.category).toBe(EndpointCategory.USER);

    // check user public endpoints are filtered (when multiple endpoints have the same url/targetport, etc)
    const userPublicEndpoints = endpoints.filter(
      endpoint =>
        endpoint.exposure === EndpointExposure.FROM_DEVFILE_PUBLIC && endpoint.category === EndpointCategory.USER
    );
    expect(userPublicEndpoints).toBeDefined();
    expect(userPublicEndpoints!.length).toBe(1);
  });
});
