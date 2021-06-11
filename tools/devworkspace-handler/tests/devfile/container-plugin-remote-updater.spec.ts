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

import { Container } from 'inversify';
import { ContainerPluginRemoteUpdater } from '../../src/devfile/container-plugin-remote-updater';
import { V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer } from '@devfile/api';

describe('Test ContainerPluginRemoteUpdater', () => {
  let container: Container;

  let containerPluginRemoteUpdater: ContainerPluginRemoteUpdater;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(ContainerPluginRemoteUpdater).toSelf().inSingletonScope();
    containerPluginRemoteUpdater = container.get(ContainerPluginRemoteUpdater);
  });

  test('basics', async () => {
    const container: V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer = {
      image: 'fake-image',
    };
    const componentName = 'myComponent';
    await containerPluginRemoteUpdater.update(componentName, container);
    expect(container.env?.find(entry => entry.name === 'PLUGIN_REMOTE_ENDPOINT_EXECUTABLE')).toBeDefined();
    const theiaPluginEnv = container.env?.find(entry => entry.name === 'THEIA_PLUGINS');
    expect(theiaPluginEnv).toBeDefined();
    expect(theiaPluginEnv?.value).toBe(`local-dir:///plugins/sidecars/${componentName}`);

    const volumeMountEndpoint = container.volumeMounts?.find(entry => entry.name === 'remote-endpoint');
    expect(volumeMountEndpoint).toBeDefined();
    expect(volumeMountEndpoint?.path).toBe('/remote-endpoint');

    const volumeMountPlugins = container.volumeMounts?.find(entry => entry.name === 'plugins');
    expect(volumeMountPlugins).toBeDefined();
    expect(volumeMountPlugins?.path).toBe('/plugins');
  });

  test('basics', async () => {
    const container: V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer = {
      image: 'fake-image',
      env: [{ name: 'FOO', value: 'BAR' }],
      volumeMounts: [{ name: 'FOO', path: '/BAR' }],
    };
    const componentName = 'myComponent';
    await containerPluginRemoteUpdater.update(componentName, container);
    expect(container.env?.find(entry => entry.name === 'PLUGIN_REMOTE_ENDPOINT_EXECUTABLE')).toBeDefined();

    const existingEnv = container.env?.find(entry => entry.name === 'FOO');
    expect(existingEnv).toBeDefined();
    expect(existingEnv?.value).toBe('BAR');

    const theiaPluginEnv = container.env?.find(entry => entry.name === 'THEIA_PLUGINS');
    expect(theiaPluginEnv).toBeDefined();
    expect(theiaPluginEnv?.value).toBe(`local-dir:///plugins/sidecars/${componentName}`);

    const volumeMountExisting = container.volumeMounts?.find(entry => entry.name === 'FOO');
    expect(volumeMountExisting).toBeDefined();
    expect(volumeMountExisting?.path).toBe('/BAR');

    const volumeMountEndpoint = container.volumeMounts?.find(entry => entry.name === 'remote-endpoint');
    expect(volumeMountEndpoint).toBeDefined();
    expect(volumeMountEndpoint?.path).toBe('/remote-endpoint');

    const volumeMountPlugins = container.volumeMounts?.find(entry => entry.name === 'plugins');
    expect(volumeMountPlugins).toBeDefined();
    expect(volumeMountPlugins?.path).toBe('/plugins');
  });
});
