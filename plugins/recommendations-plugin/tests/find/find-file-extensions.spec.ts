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
  let findFilesSpy: any;
  let cancelMethod: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    theia.workspace.findFiles = jest.fn();
    findFilesSpy = jest.spyOn(theia.workspace, 'findFiles');
    cancelMethod = jest.fn();

    const spy = jest.spyOn(theia.workspace, 'findFiles');
    (theia as any).CancellationTokenSource = jest.fn().mockImplementation(() => ({
      cancel: cancelMethod,
    }));

    container = new Container();
    container.bind(FindFileExtensions).toSelf().inSingletonScope();
  });

  test('find', async () => {
    const findFileExtensions = container.get(FindFileExtensions);
    findFilesSpy.mockResolvedValue([{ fsPath: '/tmp/foo.php' } as theia.Uri]);
    const fileExtensions = await findFileExtensions.find();
    expect(fileExtensions).toBeDefined();
    expect(fileExtensions.length).toBe(1);
    expect(fileExtensions.includes('.php')).toBeTruthy();
  });

  test('stop after', async () => {
    const findFileExtensions = container.get(FindFileExtensions);

    findFilesSpy.mockImplementation(async () => {
      await sleep(1000);
      return [{ fsPath: '/tmp/foo.php' } as theia.Uri, { fsPath: '/tmp/one.php' } as theia.Uri];
    });
    const fileExtensions = await findFileExtensions.find(500);
    expect(fileExtensions).toBeDefined();
    expect(fileExtensions.length >= 0).toBeTruthy();
    // cancel called
    expect(cancelMethod).toBeCalled();
  });

  test('stop before', async () => {
    const findFileExtensions = container.get(FindFileExtensions);

    findFilesSpy.mockImplementation(async () => [
      { fsPath: '/tmp/foo.php' } as theia.Uri,
      { fsPath: '/tmp/one.php' } as theia.Uri,
    ]);
    const fileExtensions = await findFileExtensions.find(100);
    expect(fileExtensions).toBeDefined();
    expect(fileExtensions.length >= 0).toBeTruthy();
    // cancel called not called
    expect(cancelMethod).toBeCalledTimes(0);
  });

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
