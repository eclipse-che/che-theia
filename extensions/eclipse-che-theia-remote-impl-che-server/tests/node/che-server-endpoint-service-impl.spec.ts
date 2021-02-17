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
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import 'reflect-metadata';

import * as fs from 'fs-extra';
import * as path from 'path';

import { CheServerEndpointServiceImpl } from '../../src/node/che-server-endpoint-service-impl';
import { Container } from 'inversify';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

describe('Test CheServerEndpointServiceImpl', () => {
  let container: Container;

  let cheServerEndpointServiceImpl: CheServerEndpointServiceImpl;

  const workspaceServiceCurrentWorkspaceMethod = jest.fn();
  const workspaceService = {
    currentWorkspace: workspaceServiceCurrentWorkspaceMethod,
  } as any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();

    container.bind(CheServerEndpointServiceImpl).toSelf().inSingletonScope();
    container.bind(WorkspaceService).toConstantValue(workspaceService);
    cheServerEndpointServiceImpl = container.get(CheServerEndpointServiceImpl);
  });

  test('getEndpointsByType', async () => {
    const workspaceJsonPath = path.resolve(__dirname, '..', '_data', 'workspace-runtime.json');
    const workspaceJsonContent = await fs.readFile(workspaceJsonPath, 'utf-8');
    const workspaceJson = JSON.parse(workspaceJsonContent);
    workspaceServiceCurrentWorkspaceMethod.mockResolvedValue(workspaceJson);

    const ideDevEndpoints = await cheServerEndpointServiceImpl.getEndpointsByType('ide-dev');
    expect(ideDevEndpoints).toBeDefined();
    expect(ideDevEndpoints.length).toBe(1);
    const ideDevEndPoint = ideDevEndpoints[0];
    expect(ideDevEndPoint.url).toBe('https://route4q6bj41w-che.8a09.starter-us-east-2.openshiftapps.com');
    expect(ideDevEndPoint.attributes).toBeDefined();
    expect(ideDevEndPoint.attributes!['type']).toBe('ide-dev');
    expect(ideDevEndPoint.name).toBe('theia-dev');
    expect(ideDevEndPoint.component).toBe('theia-ide9fa');
  });

  test('getEndpointsByNames', async () => {
    const workspaceJsonPath = path.resolve(__dirname, '..', '_data', 'workspace-runtime.json');
    const workspaceJsonContent = await fs.readFile(workspaceJsonPath, 'utf-8');
    const workspaceJson = JSON.parse(workspaceJsonContent);
    workspaceServiceCurrentWorkspaceMethod.mockResolvedValue(workspaceJson);

    const endpoints = await cheServerEndpointServiceImpl.getEndpointsByName('theia', 'theia-dev', 'theia-dev-flow');
    expect(endpoints).toBeDefined();
    expect(endpoints.length).toBe(2);
    const theiaEndpoint = endpoints[0];
    expect(theiaEndpoint.url).toBe('https://route4if6ve1d-che.8a09.starter-us-east-2.openshiftapps.com');
    expect(theiaEndpoint.attributes).toBeDefined();
    expect(theiaEndpoint.attributes!['type']).toBe('ide');
    expect(theiaEndpoint.name).toBe('theia');
    expect(theiaEndpoint.component).toBe('theia-ide9fa');

    const theiaDevEndpoint = endpoints[1];
    expect(theiaDevEndpoint.url).toBe('https://route4q6bj41w-che.8a09.starter-us-east-2.openshiftapps.com');
    expect(theiaDevEndpoint.attributes).toBeDefined();
    expect(theiaDevEndpoint.attributes!['type']).toBe('ide-dev');
    expect(theiaDevEndpoint.name).toBe('theia-dev');
    expect(theiaDevEndpoint.component).toBe('theia-ide9fa');
  });
});
