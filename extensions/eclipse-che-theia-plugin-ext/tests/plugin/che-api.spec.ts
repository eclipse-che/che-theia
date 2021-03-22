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

import { CheApiFactory, createAPIFactory } from '../../src/plugin/che-api';
import { CheProductService, PLUGIN_RPC_CONTEXT } from '../../src/common/che-protocol';
import { RPCProtocol, RPCProtocolImpl } from '@theia/plugin-ext/lib/common/rpc-protocol';

import { CheEndpointMainImpl } from '../../src/browser/che-endpoint-main';
import { CheProductMainImpl } from '../../src/browser/che-product-main';
import { Container } from 'inversify';
import { Emitter } from '@theia/core';
import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';

describe('che-api', () => {
  let rpcClient: RPCProtocol;
  let rpcServer: RPCProtocol;
  let cheApiFactory: CheApiFactory;
  let container: Container;
  let endpointServiceMock: any;
  beforeAll(() => {
    const emitterServer = new Emitter<any>();
    const emitterClient = new Emitter<any>();

    rpcServer = new RPCProtocolImpl({
      onMessage: emitterServer.event,
      send: (message: any) => emitterClient.fire(message),
    });

    rpcClient = new RPCProtocolImpl({
      onMessage: emitterClient.event,
      send: (message: any) => emitterServer.fire(message),
    });

    endpointServiceMock = {
      getEndpoints: jest.fn(),
      getEndpointsByName: jest.fn(),
      getEndpointsByType: () => [
        {
          name: 'machine-exec',
          component: 'foo',
        },
      ],
    };

    const productServiceMock: CheProductService = {
      getProduct: jest.fn(),
    };
    container = new Container();
    container.bind(CheProductService).toConstantValue(productServiceMock);

    rpcServer.set(PLUGIN_RPC_CONTEXT.CHE_PRODUCT_MAIN, new CheProductMainImpl(container, rpcServer));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('endpoint tests', async () => {
    const plugin: any = {};
    container.bind(EndpointService).toConstantValue(endpointServiceMock);
    rpcServer.set(PLUGIN_RPC_CONTEXT.CHE_ENDPOINT_MAIN, new CheEndpointMainImpl(container));
    cheApiFactory = createAPIFactory(rpcClient);
    const apiImpl = cheApiFactory(plugin);
    const getEndpointsByTypeSpy = jest.spyOn(endpointServiceMock, 'getEndpointsByType');
    const terminalEndpoints = await apiImpl.endpoint.getEndpointsByType('collocated-terminal');
    expect(getEndpointsByTypeSpy).toBeCalledWith('collocated-terminal');
    expect(terminalEndpoints.length).toBe(1);
    expect(terminalEndpoints[0].name).toBe('machine-exec');
  });
});
