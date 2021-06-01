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

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { CheWorkspaceClient } from '../src/che-workspace-client';
import { Container } from 'inversify';

describe('Test containers service', () => {
  const getEndpointsByTypeSpy = jest.spyOn(che.endpoint, 'getEndpointsByType');
  const createOutputChannelSpy = jest.spyOn(theia.window, 'createOutputChannel');

  let workspaceClient: CheWorkspaceClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    const outputChannelMock = {
      appendLine: jest.fn(),
    };
    createOutputChannelSpy.mockReturnValue(outputChannelMock as any);
    const container = new Container();
    container.bind(CheWorkspaceClient).toSelf().inSingletonScope();
    workspaceClient = container.get(CheWorkspaceClient);
  });

  test('Check getMachineExecServerURL', async () => {
    const exposedEndpoints: che.endpoint.ExposedEndpoint[] = [
      {
        name: 'che-machine-exec',
        targetPort: '4444',
        component: 'machine-exec',
        attributes: {
          type: 'collocated-terminal',
          discoverable: 'false',
          cookiesAuthEnabled: 'true',
          port: '4444',
        },
      },
    ];
    getEndpointsByTypeSpy.mockResolvedValue(exposedEndpoints);
    const url = await workspaceClient.getMachineExecServerURL();
    expect(url).toBe('ws://127.0.0.1:4444');
    expect(getEndpointsByTypeSpy).toBeCalled();
  });
});
