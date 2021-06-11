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

import { InversifyBinding } from '../src/inversify/inversify-binding';
import { Main } from '../src/main';
import { SidecarPolicy } from '../src/api/devfile-context';

describe('Test Main with stubs', () => {
  const FAKE_DEVFILE_URL = 'http://fake-devfile-url';
  const FAKE_OUTPUT_FILE = '/fake-output';
  const FAKE_PLUGIN_REGISTRY_URL = 'http://fake-plugin-registry-url';
  const FAKE_EDITOR = 'fake/editor';
  const SIDECAR_POLICY = SidecarPolicy.MERGE_IMAGE.toString();

  const originalConsoleError = console.error;
  const mockedConsoleError = jest.fn();

  const originalConsoleLog = console.log;
  const mockedConsoleLog = jest.fn();

  const generateMethod = jest.fn();
  const originalArgs = process.argv;
  const selfMock = {
    inSingletonScope: jest.fn(),
  };
  const toSelfMethod = jest.fn();
  const bindMock = {
    toSelf: toSelfMethod,
  };
  const generateMock = {
    generate: generateMethod as any,
  };

  const containerBindMethod = jest.fn();
  const containerGetMethod = jest.fn();
  const container = {
    bind: containerBindMethod,
    get: containerGetMethod,
  } as any;
  let spyInitBindings;

  function initArgs(
    devfileUrl: string | undefined,
    outputFile: string | undefined,
    pluginRegistryUrl: string | undefined,
    editor: string | undefined,
    sidecarPolicy: string | undefined
  ) {
    // empty args
    process.argv = ['', ''];
    if (devfileUrl) {
      process.argv.push(`--devfile-url:${devfileUrl}`);
    }
    if (outputFile) {
      process.argv.push(`--output-file:${outputFile}`);
    }
    if (pluginRegistryUrl) {
      process.argv.push(`--plugin-registry-url:${pluginRegistryUrl}`);
    }
    if (editor) {
      process.argv.push(`--editor:${editor}`);
    }
    if (sidecarPolicy) {
      process.argv.push(`--sidecar-policy:${sidecarPolicy}`);
    }
  }

  beforeEach(() => {
    initArgs(FAKE_DEVFILE_URL, FAKE_OUTPUT_FILE, FAKE_PLUGIN_REGISTRY_URL, FAKE_EDITOR, SIDECAR_POLICY);
    spyInitBindings = jest.spyOn(InversifyBinding.prototype, 'initBindings');
    spyInitBindings.mockImplementation(() => Promise.resolve(container));
    toSelfMethod.mockReturnValue(selfMock), containerBindMethod.mockReturnValue(bindMock);
    containerGetMethod.mockReturnValue(generateMock);
  });

  afterEach(() => {
    process.argv = originalArgs;
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  beforeEach(() => {
    console.error = mockedConsoleError;
    console.log = mockedConsoleLog;
  });
  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  test('success with mergeImage', async () => {
    const main = new Main();
    const returnCode = await main.start();
    expect(returnCode).toBeTruthy();
    expect(generateMethod).toBeCalledWith(FAKE_DEVFILE_URL, FAKE_EDITOR, SIDECAR_POLICY, FAKE_OUTPUT_FILE);
    expect(mockedConsoleError).toBeCalledTimes(0);
  });

  test('success with devContainer merge', async () => {
    const main = new Main();
    initArgs(
      FAKE_DEVFILE_URL,
      FAKE_OUTPUT_FILE,
      FAKE_PLUGIN_REGISTRY_URL,
      FAKE_EDITOR,
      SidecarPolicy.USE_DEV_CONTAINER.toString()
    );
    const returnCode = await main.start();
    expect(returnCode).toBeTruthy();
    expect(generateMethod).toBeCalledWith(
      FAKE_DEVFILE_URL,
      FAKE_EDITOR,
      SidecarPolicy.USE_DEV_CONTAINER.toString(),
      FAKE_OUTPUT_FILE
    );
    expect(mockedConsoleError).toBeCalledTimes(0);
  });

  test('missing devfile', async () => {
    const main = new Main();
    initArgs(undefined, FAKE_OUTPUT_FILE, FAKE_PLUGIN_REGISTRY_URL, FAKE_EDITOR, SIDECAR_POLICY);
    const returnCode = await main.start();
    expect(mockedConsoleError).toBeCalled();
    expect(mockedConsoleError.mock.calls[1][1].toString()).toContain('missing --devfile-url: parameter');
    expect(returnCode).toBeFalsy();
    expect(generateMethod).toBeCalledTimes(0);
  });

  test('missing outputfile', async () => {
    const main = new Main();
    initArgs(FAKE_DEVFILE_URL, undefined, undefined, undefined, undefined);
    const returnCode = await main.start();
    expect(mockedConsoleError).toBeCalled();
    expect(mockedConsoleError.mock.calls[1][1].toString()).toContain('missing --output-file: parameter');
    expect(returnCode).toBeFalsy();
    expect(generateMethod).toBeCalledTimes(0);
  });

  test('invalid sidecar policy', async () => {
    const main = new Main();
    initArgs(FAKE_DEVFILE_URL, undefined, undefined, undefined, 'FOO');
    const returnCode = await main.start();
    expect(mockedConsoleError).toBeCalled();
    expect(mockedConsoleError.mock.calls[1][1].toString()).toContain(
      'FOO is not a valid sidecar policy. Available values are'
    );
    expect(returnCode).toBeFalsy();
    expect(generateMethod).toBeCalledTimes(0);
  });

  test('error', async () => {
    jest.spyOn(InversifyBinding.prototype, 'initBindings').mockImplementation(() => {
      throw new Error('Dummy error');
    });
    const main = new Main();
    const returnCode = await main.start();
    expect(mockedConsoleError).toBeCalled();
    expect(returnCode).toBeFalsy();
    expect(generateMethod).toBeCalledTimes(0);
  });
});
