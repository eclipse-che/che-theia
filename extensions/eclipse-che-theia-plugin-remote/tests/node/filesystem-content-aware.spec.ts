/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { FileSystem } from '@theia/plugin';
import { FileSystemContentAware } from '../../src/node/filesystem-content-aware';
import { FileSystemExtImpl } from '@theia/plugin-ext/lib/plugin/file-system-ext-impl';
import { URI } from 'vscode-uri';

describe('Test FileSystemContentAware', () => {
  let fileSystem: FileSystem;

  const statMock = jest.fn();
  const readDirectoryMock = jest.fn();
  const readFileMock = jest.fn();
  const createDirectoryMock = jest.fn();
  const writeFileMock = jest.fn();
  const deleteMock = jest.fn();
  const renameMock = jest.fn();
  const copyMock = jest.fn();

  const sourceUri = URI.from({
    scheme: 'file',
    path: '/path',
  });

  const expectedUri = URI.from({
    scheme: 'file-sidecar-testMachine',
    path: '/path',
  });

  beforeEach(() => {
    process.env.CHE_PROJECTS_ROOT = '/projects';
    process.env.CHE_MACHINE_NAME = 'testMachine';

    jest.doMock('@theia/plugin-ext/lib/plugin/file-system-ext-impl', () => ({
      fileSystem: {
        stat: statMock,
        readDirectory: readDirectoryMock,
        readFile: readFileMock,
        createDirectory: createDirectoryMock,
        writeFile: writeFileMock,
        delete: deleteMock,
        rename: renameMock,
        copy: copyMock,
        bind: jest.fn(),
      },
    }));
    const fileSystemExtImpl = require('@theia/plugin-ext/lib/plugin/file-system-ext-impl') as FileSystemExtImpl;

    FileSystemContentAware.makeFileSystemContentAware(fileSystemExtImpl);
    fileSystem = fileSystemExtImpl.fileSystem;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Test intercepted stat method', () => {
    fileSystem.stat(sourceUri);
    expect(statMock).toHaveBeenCalledWith(expectedUri);
    expect(statMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted readDirectory method', () => {
    fileSystem.readDirectory(sourceUri);
    expect(readDirectoryMock).toHaveBeenCalledWith(expectedUri);
    expect(readDirectoryMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted readFile method', () => {
    fileSystem.readFile(sourceUri);
    expect(readFileMock).toHaveBeenCalledWith(expectedUri);
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted writeFile method', () => {
    const uint8Array = Uint8Array.of();
    fileSystem.writeFile(sourceUri, uint8Array);
    expect(writeFileMock).toHaveBeenCalledWith(expectedUri, uint8Array);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted rename method', () => {
    fileSystem.rename(sourceUri, sourceUri, undefined);
    expect(renameMock).toHaveBeenCalledWith(expectedUri, expectedUri, undefined);
    expect(renameMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted copy method', () => {
    fileSystem.copy(sourceUri, sourceUri, undefined);
    expect(copyMock).toHaveBeenCalledWith(expectedUri, expectedUri, undefined);
    expect(copyMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted createDirectory method', () => {
    fileSystem.createDirectory(sourceUri);
    expect(createDirectoryMock).toHaveBeenCalledWith(expectedUri);
    expect(createDirectoryMock).toHaveBeenCalledTimes(1);
  });

  test('Test intercepted delete method', () => {
    fileSystem.delete(sourceUri, undefined);
    expect(deleteMock).toHaveBeenCalledWith(expectedUri, undefined);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
