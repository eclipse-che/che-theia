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
import { SidecarComponentsCreator } from '../../src/devfile/sidecar-components-creator';
import { VSCodeExtensionEntryWithSidecar } from '../../src/api/vscode-extension-entry';

describe('Test SidecarComponentsCreator', () => {
  let container: Container;

  let sidecarComponentsCreator: SidecarComponentsCreator;

  const containerPluginRemoteUpdaterUpdateMethod = jest.fn();
  const containerPluginRemoteUpdater = {
    update: containerPluginRemoteUpdaterUpdateMethod,
  } as ContainerPluginRemoteUpdater;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(SidecarComponentsCreator).toSelf().inSingletonScope();
    container.bind(ContainerPluginRemoteUpdater).toConstantValue(containerPluginRemoteUpdater);

    sidecarComponentsCreator = container.get(SidecarComponentsCreator);
  });

  test('basics', async () => {
    const entry: VSCodeExtensionEntryWithSidecar = {
      id: 'plugin',
      sidecarName: 'my-sidecar',
      resolved: true,
      extensions: ['http://first.vsix'],
      preferences: {
        foo: 'bar',
      },
      sidecar: {
        image: 'my-image',
      },
    };
    const components = await sidecarComponentsCreator.create([entry]);
    expect(containerPluginRemoteUpdaterUpdateMethod).toBeCalledWith('my-sidecar', entry.sidecar);
    expect(components.length).toBe(1);
    const component = components[0];
    expect(component.name).toBe(entry.sidecarName);
    expect(component.container).toBe(entry.sidecar);
    const componentAttributes = component.attributes || ({} as any);
    expect(componentAttributes['app.kubernetes.io/part-of']).toBe('che-theia.eclipse.org');
    expect(componentAttributes['app.kubernetes.io/component']).toBe('vscode-extension');
    expect(componentAttributes['che-theia.eclipse.org/vscode-extensions']).toStrictEqual(['http://first.vsix']);
    expect(componentAttributes['che-theia.eclipse.org/vscode-preferences']).toStrictEqual({ foo: 'bar' });
  });

  test('basics no sidecarname and preferences', async () => {
    const entry: VSCodeExtensionEntryWithSidecar = {
      id: 'merged-registry-redhat-io-codeready-workspaces-plugin-java8-rhel8-sha256-f0ecc1812888611407c23ede1d3952dfb7b9bd597c336f22995cc4d8d9c23edd',
      resolved: true,
      extensions: ['http://first.vsix'],
      sidecar: {
        image:
          'registry.redhat.io/codeready-workspaces/plugin-java8-rhel8@sha256:f0ecc1812888611407c23ede1d3952dfb7b9bd597c336f22995cc4d8d9c23edd',
      },
    };
    const components = await sidecarComponentsCreator.create([entry]);
    expect(containerPluginRemoteUpdaterUpdateMethod).toBeCalledWith(
      'sidecar-merged-registry-redhat-io-codeready-workspaces-plugin-j',
      entry.sidecar
    );
    expect(components.length).toBe(1);
    const component = components[0];
    expect(component.name).toBe('sidecar-merged-registry-redhat-io-codeready-workspaces-plugin-j');
    // check length is cut to 63 characters
    expect(component.name.length).toBe(63);

    expect(component.container).toBe(entry.sidecar);
    const componentAttributes = component.attributes || ({} as any);
    expect(componentAttributes['app.kubernetes.io/part-of']).toBe('che-theia.eclipse.org');
    expect(componentAttributes['app.kubernetes.io/component']).toBe('vscode-extension');
    expect(componentAttributes['che-theia.eclipse.org/vscode-extensions']).toStrictEqual(['http://first.vsix']);
    expect(componentAttributes['che-theia.eclipse.org/vscode-preferences']).toBeUndefined();
  });
});
