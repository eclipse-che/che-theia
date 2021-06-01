/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import 'reflect-metadata';

import { Container } from 'inversify';
import { K8sHelper } from '../src/k8s-helper';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('execa');
jest.mock('@kubernetes/client-node');

describe('Test K8sHelper', () => {
  let container: Container;
  let k8sHelper: K8sHelper;

  beforeEach(() => {
    container = new Container();
    container.bind(K8sHelper).toSelf().inSingletonScope();
    k8sHelper = container.get(K8sHelper);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  test('get API', async () => {
    const initConfigSpy = jest.spyOn(k8sHelper, 'initConfig');
    const loadFromDefaultMethod = jest.fn();
    const makeApiClientMethod = jest.fn();

    const kubeConfigMock = {
      loadFromDefault: loadFromDefaultMethod,
      makeApiClient: makeApiClientMethod,
    } as any;
    initConfigSpy.mockReturnValue(kubeConfigMock);

    const makeApiClientResult = { foo: 'bar' };
    makeApiClientMethod.mockReturnValue(makeApiClientResult);

    const coreApi = k8sHelper.getCoreApi();
    expect(loadFromDefaultMethod).toBeCalled();
    expect(makeApiClientMethod).toBeCalled();
    expect(coreApi).toBe(makeApiClientResult);

    const newCall = k8sHelper.getCoreApi();
    expect(newCall).toEqual(coreApi);
  });

  test('config', async () => {
    const config = k8sHelper.initConfig();
    expect(config).toBeDefined();
  });
});
