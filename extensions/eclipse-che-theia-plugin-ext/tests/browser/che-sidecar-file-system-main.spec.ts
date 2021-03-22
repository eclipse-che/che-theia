/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  AbstractSideCarFileSystemProvider,
  CheSideCarFileSystemMainImpl,
} from '../../src/browser/che-sidecar-file-system-main';

import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { CheSideCarFileSystem } from '../../src/common/che-protocol';
import { CheSideCarFileSystemProvider } from '../../src/browser/che-sidecar-file-system-main';
import { Container } from 'inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileSystemProviderCapabilities } from '@theia/filesystem/lib/common/files';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import URI from '@theia/core/lib/common/uri';

describe('Test AbstractSideCarFileSystemProvider', () => {
  class MockAbstractSideCarFileSystemProvider extends AbstractSideCarFileSystemProvider {
    constructor(capabilities: FileSystemProviderCapabilities) {
      super(capabilities);
    }
  }

  let testContainer: Container;

  const expectedError = new Error('Not implemented.');

  beforeEach(() => {
    testContainer = new Container();
    testContainer
      .bind(AbstractSideCarFileSystemProvider)
      .toConstantValue(new MockAbstractSideCarFileSystemProvider(FileSystemProviderCapabilities.Readonly));
  });

  afterEach(() => {
    testContainer.unbindAll();
  });

  test('Should throw exception on delete method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.delete(new URI(), { recursive: false, useTrash: false })).toThrow(expectedError);
  });

  test('Should throw exception on mkdir method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.mkdir(new URI())).toThrow(expectedError);
  });

  test('Should throw exception on readFile method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.readFile(new URI())).toThrow(expectedError);
  });

  test('Should throw exception on readdir method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.readdir(new URI())).toThrow(expectedError);
  });

  test('Should throw exception on rename method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.rename(new URI(), new URI(), { overwrite: false })).toThrow(expectedError);
  });

  test('Should throw exception on stat method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.stat(new URI())).toThrow(expectedError);
  });

  test('Should throw exception on watch method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.watch(new URI(), { recursive: false, excludes: [] })).toThrow(expectedError);
  });

  test('Should throw exception on writeFile method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.writeFile(new URI(), Uint8Array.of(), { overwrite: false, create: false })).toThrow(
      expectedError
    );
  });

  test('Should throw exception on copy method', () => {
    const provider = testContainer.get<AbstractSideCarFileSystemProvider>(AbstractSideCarFileSystemProvider);
    expect(() => provider.copy(new URI(), new URI(), { overwrite: false })).toThrow(expectedError);
  });
});

describe('Test CheSideCarFileSystemMainImpl', () => {
  class MockAbstractSideCarFileSystemProvider extends AbstractSideCarFileSystemProvider {
    constructor(capabilities: FileSystemProviderCapabilities) {
      super(capabilities);
    }
  }

  let testContainer: Container;
  const registerProviderMock = jest.fn();
  const getProxyMock = jest.fn(() => {});

  beforeAll(() => {
    jest.doMock('@theia/filesystem/lib/browser/file-service', () => ({
      registerProvider: registerProviderMock,
    }));

    const fileService = require('@theia/filesystem/lib/browser/file-service') as FileService;

    jest.doMock('@theia/plugin-ext/lib/common/rpc-protocol', () => ({
      getProxy: getProxyMock,
    }));

    testContainer = new Container();
    testContainer.bind(FileService).toConstantValue(fileService);
    testContainer
      .bind(AbstractSideCarFileSystemProvider)
      .toConstantValue(new MockAbstractSideCarFileSystemProvider(FileSystemProviderCapabilities.Readonly));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('Should register file system provider', () => {
    const rpcProtocol = require('@theia/plugin-ext/lib/common/rpc-protocol') as RPCProtocol;
    const fileSystemMain = new CheSideCarFileSystemMainImpl(testContainer, rpcProtocol);

    expect(registerProviderMock).toHaveBeenCalledTimes(0);

    fileSystemMain.$registerFileSystemProvider('test');

    expect(registerProviderMock).toHaveBeenCalledTimes(1);
  });
});

describe('Test CheSideCarFileSystemProvider', () => {
  const $statMock = jest.fn();
  const $readFileMock = jest.fn(() => ({
    buffer: Uint8Array.of(),
  }));
  const $writeFileMock = jest.fn();
  const $deleteMock = jest.fn();
  const $renameMock = jest.fn();
  const $copyMock = jest.fn();
  const $mkdirMock = jest.fn();
  const $readdirMock = jest.fn();

  let provider: CheSideCarFileSystemProvider;

  beforeEach(() => {
    jest.doMock('../../src/common/che-protocol', () => ({
      $stat: $statMock,
      $readFile: $readFileMock,
      $writeFile: $writeFileMock,
      $delete: $deleteMock,
      $rename: $renameMock,
      $copy: $copyMock,
      $mkdir: $mkdirMock,
      $readdir: $readdirMock,
    }));

    const delegate = require('../../src/common/che-protocol') as CheSideCarFileSystem;
    provider = new CheSideCarFileSystemProvider(delegate, FileSystemProviderCapabilities.Readonly);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Should call stat in delegate object', () => {
    provider.stat(new URI('/test'));
    expect($statMock).toHaveBeenCalledTimes(1);
    expect($statMock).toHaveBeenCalledWith('/test');
  });

  test('Should call readFile in delegate object', () => {
    provider.readFile(new URI('/test'));
    expect($readFileMock).toHaveBeenCalledTimes(1);
    expect($readFileMock).toHaveBeenCalledWith('/test');
  });

  test('Should call writeFile in delegate object', () => {
    provider.writeFile(new URI('/test'), Uint8Array.of(), { overwrite: true, create: true });
    expect($writeFileMock).toHaveBeenCalledTimes(1);
    expect($writeFileMock).toHaveBeenCalledWith('/test', BinaryBuffer.wrap(Uint8Array.of()), {
      overwrite: true,
      create: true,
    });
  });

  test('Should call delete in delegate object', () => {
    provider.delete(new URI('/test'), { recursive: true, useTrash: true });
    expect($deleteMock).toHaveBeenCalledTimes(1);
    expect($deleteMock).toHaveBeenCalledWith('/test', { recursive: true, useTrash: true });
  });

  test('Should call rename in delegate object', () => {
    provider.rename(new URI('/source'), new URI('/target'), { overwrite: true });
    expect($renameMock).toHaveBeenCalledTimes(1);
    expect($renameMock).toHaveBeenCalledWith('/source', '/target', { overwrite: true });
  });

  test('Should call copy in delegate object', () => {
    provider.copy(new URI('/source'), new URI('/target'), { overwrite: true });
    expect($copyMock).toHaveBeenCalledTimes(1);
    expect($copyMock).toHaveBeenCalledWith('/source', '/target', { overwrite: true });
  });

  test('Should call mkdir in delegate object', () => {
    provider.mkdir(new URI('/test'));
    expect($mkdirMock).toHaveBeenCalledTimes(1);
    expect($mkdirMock).toHaveBeenCalledWith('/test');
  });

  test('Should call readdir in delegate object', () => {
    provider.readdir(new URI('/test'));
    expect($readdirMock).toHaveBeenCalledTimes(1);
    expect($readdirMock).toHaveBeenCalledWith('/test');
  });
});
