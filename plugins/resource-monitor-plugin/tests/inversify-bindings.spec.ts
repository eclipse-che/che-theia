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

import * as theia from '@theia/plugin';

import { Container } from 'inversify';
import { InversifyBinding } from '../src/inversify-binding';
import { K8sHelper } from '../src/k8s-helper';
import { ResourceMonitor } from '../src/resource-monitor';

const createStatusBar = jest.fn();
const statusBarItem: theia.StatusBarItem = {
  alignment: 1,
  color: '',
  text: '',
  tooltip: '',
  command: '',
  priority: 0,
  dispose: jest.fn(),
  hide: jest.fn(),
  show: jest.fn(),
};

describe('Test InversifyBinding', () => {
  test('bindings', async () => {
    theia.window.createStatusBarItem = createStatusBar;
    createStatusBar.mockReturnValue(statusBarItem);
    const inversifyBinding = new InversifyBinding();
    const container: Container = await inversifyBinding.initBindings();

    expect(inversifyBinding).toBeDefined();

    expect(container.get(ResourceMonitor)).toBeDefined();
    expect(container.get(K8sHelper)).toBeDefined();
  });
});
