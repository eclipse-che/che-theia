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
import * as path from 'path';

import { Container } from 'inversify';
import { K8sDevfileServiceImpl } from '../../src/node/k8s-devfile-service-impl';
import { K8sEndpointServiceImpl } from '../../src/node/k8s-endpoint-service-impl';

describe.only('Test K8sEndpointServiceImpl', () => {
  let container: Container;

  let k8sEndpointServiceImpl: K8sEndpointServiceImpl;

  const getWorkspaceRoutingMethod = jest.fn();
  const k8sDevfileServiceImplMock = {
    getWorkspaceRouting: getWorkspaceRoutingMethod,
  } as any;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(K8sEndpointServiceImpl).toSelf().inSingletonScope();
    container.bind(K8sDevfileServiceImpl).toConstantValue(k8sDevfileServiceImplMock);
    k8sEndpointServiceImpl = container.get(K8sEndpointServiceImpl);
    const workspaceRoutingJsonPath = path.resolve(__dirname, '..', '_data', 'workspace-routing-object.json');
    const workspaceRoutingJsonContent = await fs.readFile(workspaceRoutingJsonPath, 'utf-8');
    const workspaceRoutingJson = JSON.parse(workspaceRoutingJsonContent);
    getWorkspaceRoutingMethod.mockReturnValue(workspaceRoutingJson);
  });

  test('getEndpointsByType', async () => {
    const ideEndpoints = await k8sEndpointServiceImpl.getEndpointsByType('ide');

    expect(ideEndpoints).toBeDefined();
    expect(ideEndpoints.length).toBe(1);
    const ideEndpoint = ideEndpoints[0];

    expect(ideEndpoint.name).toBe('theia');
    expect(ideEndpoint.url).toBe('http://workspaceeb55021d3cff42e0-theia-3100.192.168.64.31.nip.io');
    expect(ideEndpoint.component).toBe('theia-ide');
  });

  test('getEndpointsByName', async () => {
    const ideEndpoints = await k8sEndpointServiceImpl.getEndpointsByName('theia');

    expect(ideEndpoints).toBeDefined();
    expect(ideEndpoints.length).toBe(1);
    const ideEndpoint = ideEndpoints[0];

    expect(ideEndpoint.name).toBe('theia');
    expect(ideEndpoint.url).toBe('http://workspaceeb55021d3cff42e0-theia-3100.192.168.64.31.nip.io');
    expect(ideEndpoint.component).toBe('theia-ide');
  });
});
