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

/* eslint-disable @typescript-eslint/no-explicit-any */
const startMethodMock = jest.fn();

jest.mock('../src/main', () => ({
  Main: function () {
    return { start: startMethodMock };
  },
}));

describe('Test Entrypoint', () => {
  const originalProcessExitCode = process.exitCode;
  const originalConsoleError = console.error;
  const mockedConsoleError = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    console.error = mockedConsoleError;
  });
  afterEach(() => {
    console.error = originalConsoleError;
    process.exitCode = originalProcessExitCode;
  });

  test('entrypoint', async () => {
    startMethodMock.mockResolvedValue(true);
    await require('../src/entrypoint');
    expect(startMethodMock).toBeCalled();
    expect(process.exitCode).toBeUndefined();
  });

  test('entrypoint fail to start', async () => {
    const spyExit = jest.spyOn(process, 'exit');
    const value: never = {} as never;
    spyExit.mockReturnValue(value);
    await require('../src/entrypoint');
    startMethodMock.mockResolvedValue(false);
    expect(spyExit).toBeCalled();
    expect(startMethodMock).toBeCalled();
  });
});
