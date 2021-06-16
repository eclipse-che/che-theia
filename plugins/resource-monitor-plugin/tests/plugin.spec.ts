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

import * as che from '@eclipse-che/plugin';
import * as plugin from '../src/plugin';
import * as theia from '@theia/plugin';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container } from 'inversify';
import { InversifyBinding } from '../src/inversify-binding';
import { ResourceMonitor } from '../src/resource-monitor';

const uri: theia.Uri = {
  authority: '',
  fragment: '',
  fsPath: '',
  path: '',
  query: '',
  scheme: '',
  toJSON: jest.fn(),
  toString: jest.fn(),
  with: jest.fn(),
};

const context: theia.PluginContext = {
  environmentVariableCollection: {
    persistent: false,
    append: jest.fn(),
    clear: jest.fn(),
    delete: jest.fn(),
    forEach: jest.fn(),
    get: jest.fn(),
    prepend: jest.fn(),
    replace: jest.fn(),
  },
  secrets: {
    get: jest.fn(),
    delete: jest.fn(),
    store: jest.fn(),
    onDidChange: jest.fn(),
  },
  extensionPath: '',
  extensionUri: uri,
  storageUri: uri,
  globalStorageUri: uri,
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  globalStoragePath: '',
  logPath: '',
  storagePath: '',
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  asAbsolutePath: jest.fn(),
};

describe('Test Plugin', () => {
  jest.mock('../src/inversify-binding');
  const devfileMock = jest.fn();
  let oldBindings: any;
  let initBindings: jest.Mock;

  beforeEach(() => {
    // Prepare Namespace
    che.devfile.get = devfileMock;
    const attributes = { infrastructureNamespace: 'che-namespace' };
    const devfile = {
      metadata: {
        attributes,
      },
    };
    devfileMock.mockReturnValue(devfile);
    oldBindings = InversifyBinding.prototype.initBindings;
    initBindings = jest.fn();
    InversifyBinding.prototype.initBindings = initBindings;
  });

  afterEach(() => {
    InversifyBinding.prototype.initBindings = oldBindings;
  });

  test('start', async () => {
    const container = new Container();
    const mockResourceMonitorPlugin = { start: jest.fn() };
    container.bind(ResourceMonitor).toConstantValue(mockResourceMonitorPlugin as any);
    initBindings.mockReturnValue(container);

    await plugin.start(context);
    expect(mockResourceMonitorPlugin.start).toBeCalled();
  });

  describe('getNamespace', () => {
    test('read che namespace from devfile service', async () => {
      const namespace = await plugin.getNamespace();
      expect(namespace).toBe('che-namespace');
    });
    test('read che namespace from workspace service if no infrastructureNamespace attribute in devile metadata', async () => {
      const devfile = {
        metadata: {},
      };
      devfileMock.mockReturnValue(devfile);
      const namespace = await plugin.getNamespace();
      expect(namespace).toBe('');
    });
  });
});
