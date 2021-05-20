/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */

import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

import { Container } from 'inversify';
import { K8sDevfileServiceImpl } from '../../src/node/k8s-devfile-service-impl';
import { K8sEndpointServiceImpl } from '../../src/node/k8s-endpoint-service-impl';

describe.only('Test K8sEndpointServiceImpl', () => {
  let container: Container;

  let k8sEndpointServiceImpl: K8sEndpointServiceImpl;

  const getDevfileMethod = jest.fn();
  const k8sDevfileServiceImplMock = {
    get: getDevfileMethod,
  } as any;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(K8sEndpointServiceImpl).toSelf().inSingletonScope();
    container.bind(K8sDevfileServiceImpl).toConstantValue(k8sDevfileServiceImplMock);
    k8sEndpointServiceImpl = container.get(K8sEndpointServiceImpl);

    const flattenedDevfilePath = path.resolve(__dirname, '..', '_data', 'flattened-devfile.yaml');
    const flattenedDevfileContent = await fs.readFile(flattenedDevfilePath, 'utf-8');
    getDevfileMethod.mockReturnValue(jsYaml.safeLoad(flattenedDevfileContent));
  });

  test('getEndpointsByType', async () => {
    const ideEndpoints = await k8sEndpointServiceImpl.getEndpointsByType('main');

    expect(ideEndpoints).toBeDefined();
    expect(ideEndpoints.length).toBe(1);
    const ideEndpoint = ideEndpoints[0];

    expect(ideEndpoint.name).toBe('theia');
    expect(ideEndpoint.url).toMatch(new RegExp('http://workspace.*-theia-3100.192.168.*.*.nip.io'));
    expect(ideEndpoint.component).toBe('theia-ide');
  });

  test('getEndpointsByName', async () => {
    const ideEndpoints = await k8sEndpointServiceImpl.getEndpointsByName('theia');

    expect(ideEndpoints).toBeDefined();
    expect(ideEndpoints.length).toBe(1);
    const ideEndpoint = ideEndpoints[0];

    expect(ideEndpoint.name).toBe('theia');
    expect(ideEndpoint.url).toMatch(new RegExp('http://workspace.*-theia-3100.192.168.*.*.nip.io'));
    expect(ideEndpoint.component).toBe('theia-ide');
  });
});
