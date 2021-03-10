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

import { ChePluginRegistry } from '../../src/registry/che-plugin-registry';
import { Container } from 'inversify';

describe('Test ChePluginRegistry', () => {
  let container: Container;
  const getSettingsMock = jest.fn();

  beforeEach(() => {
    container = new Container();
    che.workspace.getSettings = getSettingsMock;
    jest.resetAllMocks();
    container.bind(ChePluginRegistry).toSelf().inSingletonScope();
  });

  test('check internal', async () => {
    const dummyUrl = 'https://foo.registry';
    const fakeSettings = {
      cheWorkspacePluginRegistryInternalUrl: dummyUrl,
    };
    getSettingsMock.mockResolvedValue(fakeSettings);
    const chePluginRegistry = container.get(ChePluginRegistry);
    const registryUrl = await chePluginRegistry.getUrl();
    expect(registryUrl).toBe(fakeSettings.cheWorkspacePluginRegistryInternalUrl);

    const anotherCallRegistryUrl = await chePluginRegistry.getUrl();
    expect(anotherCallRegistryUrl).toEqual(registryUrl);

    // API is called only once
    expect(getSettingsMock).toBeCalledTimes(1);
  });

  test('check external', async () => {
    const dummyUrl = 'https://foo.registry';
    const fakeSettings = {
      cheWorkspacePluginRegistryUrl: dummyUrl,
    };
    getSettingsMock.mockResolvedValue(fakeSettings);
    const chePluginRegistry = container.get(ChePluginRegistry);
    const registryUrl = await chePluginRegistry.getUrl();
    expect(registryUrl).toBe(fakeSettings.cheWorkspacePluginRegistryUrl);
  });
});
