/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import * as che from '@eclipse-che/plugin';
import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';

import { DevWorkspaceDevfileHandlerImpl } from '../../src/devfile-handler-devworkspace-impl';
import { DevfileHandler } from '../../src/devfile-handler';
import { EndpointCategory } from '../../src/endpoint-category';
import { EndpointExposure } from '../../src/endpoint-exposure';

describe('Test Workspace Endpoints', () => {
  let devfileHandler: DevfileHandler;

  const OLD_ENV = process.env;

  beforeEach(() => {
    devfileHandler = new DevWorkspaceDevfileHandlerImpl();
    jest.resetModules();
    process.env = {};
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('test ports opened', async () => {
    const output = await fs.readFile(__dirname + '/devworkspace-flattened.yaml', 'utf-8');
    const devfile = jsYaml.load(output);
    (che as any).setDevfile(devfile);

    // jwt proxy
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4401 = '4401';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4400 = '4400';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_4402 = '4402';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_EMPTY = '';
    process.env.SERVERU2DZ64P8_JWTPROXY_SERVICE_PORT_SERVER_INVALID = 'invalid';

    const endpoints = await devfileHandler.getEndpoints();

    expect(endpoints).toBeDefined();
    expect(Array.isArray(endpoints)).toBe(true);
    expect(endpoints.length).toBe(15);

    expect(endpoints[0].targetPort).toBe(3100);
    expect(endpoints[0].url).toBe('https://workspace4bdbaf7a58884128-1.apps.cluster-c1dd.c1dd.sandbox85.opentlc.com/');
    expect(endpoints[0].name).toBe('theia');
    expect(endpoints[0].exposure).toBe(EndpointExposure.FROM_DEVFILE_PUBLIC);
    expect(endpoints[0].category).toBe(EndpointCategory.PLUGINS);

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
    const output = await fs.readFile(__dirname + '/devworkspace-flattened.yaml', 'utf-8');
    const devfile = jsYaml.load(output);
    (che as any).setDevfile(devfile);

    const endpoints = await devfileHandler.getEndpoints();

    // check that quarkus debug port is private
    const result = endpoints.filter(endpoint => endpoint.name === 'debug');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBe(1);
    const quarkusEndpoint = result[0];
    expect(quarkusEndpoint.targetPort).toBe(5005);
    expect(quarkusEndpoint.exposure).toBe(EndpointExposure.FROM_DEVFILE_NONE);
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
