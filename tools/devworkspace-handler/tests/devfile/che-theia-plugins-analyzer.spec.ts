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

import * as fs from 'fs-extra';
import * as path from 'path';

import { CheTheiaPluginsAnalyzer } from '../../src/devfile/che-theia-plugins-analyzer';
import { Container } from 'inversify';

describe('Test CheTheiaPluginsAnalyzer', () => {
  let container: Container;

  let cheTheiaPluginsAnalyzer: CheTheiaPluginsAnalyzer;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(CheTheiaPluginsAnalyzer).toSelf().inSingletonScope();
    cheTheiaPluginsAnalyzer = container.get(CheTheiaPluginsAnalyzer);
  });

  test('basic', async () => {
    const cheTheiaPluginsYamlPath = path.resolve(__dirname, '..', '_data', 'che-theia', 'che-theia-plugins-id.yaml');
    const cheTheiaPluginsYamlContent = await fs.readFile(cheTheiaPluginsYamlPath, 'utf-8');

    const entries = await cheTheiaPluginsAnalyzer.extractPlugins(cheTheiaPluginsYamlContent);
    expect(entries.length).toBe(1);
    expect(entries[0]).toStrictEqual({
      id: 'redhat/java/latest',
      resolved: false,
      extensions: [],
    });
  });

  test('invalid yaml / empty', async () => {
    const entries = await cheTheiaPluginsAnalyzer.extractPlugins('foo');
    expect(entries.length).toBe(0);
  });
});
