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
import { DevContainerComponentFinder } from '../../src/devfile/dev-container-component-finder';
import { DevContainerComponentUpdater } from '../../src/devfile/dev-container-component-updater';
import { DevfileContext } from '../../src/api/devfile-context';
import { V1alpha2DevWorkspaceSpecTemplateComponents } from '@devfile/api';
import { VSCodeExtensionDevContainer } from '../../src/devfile/vscode-extension-dev-container';

describe('Test DevContainerComponentUpdater', () => {
  let container: Container;

  let devContainerComponentUpdater: DevContainerComponentUpdater;
  const devContainerComponentFinderFindMethod = jest.fn();
  const devContainerComponentFinder = {
    find: devContainerComponentFinderFindMethod,
  } as DevContainerComponentFinder;

  const containerPluginRemoteUpdaterUpdateMethod = jest.fn();
  const containerPluginRemoteUpdater = {
    update: containerPluginRemoteUpdaterUpdateMethod,
  } as ContainerPluginRemoteUpdater;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(DevContainerComponentUpdater).toSelf().inSingletonScope();
    container.bind(DevContainerComponentFinder).toConstantValue(devContainerComponentFinder);
    container.bind(ContainerPluginRemoteUpdater).toConstantValue(containerPluginRemoteUpdater);

    devContainerComponentUpdater = container.get(DevContainerComponentUpdater);
  });

  test('basics', async () => {
    const devfileContext = {} as DevfileContext;

    const devContainerComponent: V1alpha2DevWorkspaceSpecTemplateComponents = {
      name: 'foo',
      attributes: {},
      container: {
        image: 'foo',
        env: [
          {
            name: 'EXISTING',
            value: 'EXISTING_VALUE',
          },
        ],
        endpoints: [{ name: 'existing', targetPort: 2 }],

        volumeMounts: [
          {
            name: 'existing',
            path: '/existing',
          },
        ],
      },
    };
    devContainerComponentFinderFindMethod.mockResolvedValue(devContainerComponent);

    const vSCodeExtensionDevContainer: VSCodeExtensionDevContainer = {
      preferences: {
        foo: 'foo',
        bar: 'bar',
      },
      env: [
        {
          name: 'FOO_ENV',
          value: 'FOO_VALUE',
        },
      ],
      volumeMounts: [
        {
          name: 'foo',
          path: '/bar',
        },
        {
          name: 'existing',
          path: '/existing',
        },
      ],
      endpoints: [
        {
          name: 'endpoint1',
          targetPort: 1,
        },
      ],
      extensions: ['http://first.vsix', 'http://second.vsix'],
    };
    await devContainerComponentUpdater.insert(devfileContext, vSCodeExtensionDevContainer);

    // check that inside the devContainer we have stuff being added
    const attributes = devContainerComponent.attributes || ({} as any);
    expect(attributes['che-theia.eclipse.org/vscode-extensions']).toStrictEqual(vSCodeExtensionDevContainer.extensions);
    expect(attributes['che-theia.eclipse.org/vscode-preferences']).toStrictEqual({ bar: 'bar', foo: 'foo' });
    expect(attributes['app.kubernetes.io/name']).toBe('foo');
    expect(devContainerComponent?.container?.env).toStrictEqual([
      { name: 'EXISTING', value: 'EXISTING_VALUE' },
      { name: 'FOO_ENV', value: 'FOO_VALUE' },
    ]);
    expect(devContainerComponent?.container?.endpoints).toStrictEqual([
      { name: 'existing', targetPort: 2 },
      { name: 'endpoint1', targetPort: 1 },
    ]);
    expect(devContainerComponent?.container?.volumeMounts).toStrictEqual([
      {
        name: 'existing',
        path: '/existing',
      },
      {
        name: 'foo',
        path: '/bar',
      },
    ]);
    // args updated
    expect(devContainerComponent?.container?.args).toStrictEqual(['sh', '-c', '${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}']);
  });

  test('basics without existing', async () => {
    const devfileContext = {} as DevfileContext;

    const devContainerComponent: V1alpha2DevWorkspaceSpecTemplateComponents = {
      name: 'foo',
      container: {
        image: 'foo',
      },
    };
    devContainerComponentFinderFindMethod.mockResolvedValue(devContainerComponent);

    const vSCodeExtensionDevContainer: VSCodeExtensionDevContainer = {
      extensions: ['http://first.vsix', 'http://second.vsix'],
    };
    await devContainerComponentUpdater.insert(devfileContext, vSCodeExtensionDevContainer);

    // check that inside the devContainer we have stuff being added
    const attributes = devContainerComponent.attributes || ({} as any);
    expect(attributes['che-theia.eclipse.org/vscode-extensions']).toStrictEqual(vSCodeExtensionDevContainer.extensions);
    expect(attributes['che-theia.eclipse.org/vscode-preferences']).toBeUndefined();
    expect(attributes['app.kubernetes.io/name']).toBe('foo');
    expect(devContainerComponent?.container?.endpoints).toBeUndefined();
    expect(devContainerComponent?.container?.volumeMounts).toBeUndefined();
    // args updated
    expect(devContainerComponent?.container?.args).toStrictEqual(['sh', '-c', '${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}']);
  });

  test('not a dev container', async () => {
    const devfileContext = {} as DevfileContext;

    const devContainerComponent: V1alpha2DevWorkspaceSpecTemplateComponents = {
      name: 'foo',
    };
    const vSCodeExtensionDevContainer: VSCodeExtensionDevContainer = {
      extensions: [],
    };
    devContainerComponentFinderFindMethod.mockResolvedValue(devContainerComponent);

    await expect(devContainerComponentUpdater.insert(devfileContext, vSCodeExtensionDevContainer)).rejects.toThrow(
      'The dev container should be a component'
    );
  });
});
