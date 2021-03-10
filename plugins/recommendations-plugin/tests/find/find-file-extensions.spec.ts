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

import * as globby from 'globby';
import * as path from 'path';
import * as theia from '@theia/plugin';

import { Container } from 'inversify';
import { FindFileExtensions } from '../../src/find/find-file-extensions';

describe('Test FindFile implementation', () => {
  let container: Container;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(FindFileExtensions).toSelf().inSingletonScope();
  });

  test('find', async () => {
    const findFileExtensions = container.get(FindFileExtensions);
    const findPath = path.join(__dirname, '..', '_data', 'find');
    const uri = { path: findPath };
    const workspaceFolder = { uri } as theia.WorkspaceFolder;
    const workspaceFolders: theia.WorkspaceFolder[] = [workspaceFolder];
    const fileExtensions = await findFileExtensions.find(workspaceFolders);
    expect(fileExtensions).toBeDefined();
    expect(fileExtensions.length).toBe(4);
    expect(fileExtensions.includes('.php')).toBeTruthy();
    expect(fileExtensions.includes('.java')).toBeTruthy();
    expect(fileExtensions.includes('.py')).toBeTruthy();
    expect(fileExtensions.includes('.json')).toBeTruthy();
  });

  test('stop fast', async () => {
    const findFileExtensions = container.get(FindFileExtensions);
    const findPath = path.join(__dirname, '..', '_data', 'find');
    const fileExtensions = await findFileExtensions.findInFolder(findPath, 0);
    expect(fileExtensions).toBeDefined();
    expect(fileExtensions.length >= 0).toBeTruthy();
  });

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  test('multiple end event', async () => {
    (globby as any).__setStreamEnd();
    const findFileExtensions = container.get(FindFileExtensions);
    const findPath = path.join(__dirname, '..', '_data', 'find');
    const fileExtensions = await findFileExtensions.findInFolder(findPath, 100);
    await sleep(1000);
    expect(fileExtensions).toBeDefined();
    expect(fileExtensions.length).toBe(4);
  });
});
