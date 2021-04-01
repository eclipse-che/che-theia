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

import { Container } from 'inversify';
import { VscodeExtensionJsonAnalyzer } from '../../src/devfile/vscode-extension-json-analyzer';

describe('Test VscodeExtensionJsonAnalyzer', () => {
  let container: Container;

  let vscodeExtensionJsonAnalyzer: VscodeExtensionJsonAnalyzer;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(VscodeExtensionJsonAnalyzer).toSelf().inSingletonScope();
    vscodeExtensionJsonAnalyzer = container.get(VscodeExtensionJsonAnalyzer);
  });

  test('basic', async () => {
    const vscodeExtensionJsonPath = path.resolve(__dirname, '..', '_data', 'vscode', 'vscode-extensions.json');
    const vscodeExtensionJsonContent = await fs.readFile(vscodeExtensionJsonPath, 'utf-8');

    const entries = await vscodeExtensionJsonAnalyzer.extractPlugins(vscodeExtensionJsonContent);
    expect(entries.length).toBe(2);
    expect(entries[0]).toStrictEqual({
      id: 'dbaeumer/vscode-eslint/latest',
      resolved: false,
      optional: true,
      extensions: [],
    });
    expect(entries[1]).toStrictEqual({
      id: 'editorconfig/editorconfig/latest',
      resolved: false,
      optional: true,
      extensions: [],
    });
  });

  test('invalid json / empty', async () => {
    const entries = await vscodeExtensionJsonAnalyzer.extractPlugins('foo');
    expect(entries.length).toBe(0);
  });
});
