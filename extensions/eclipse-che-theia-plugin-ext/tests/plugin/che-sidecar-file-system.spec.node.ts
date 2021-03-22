/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as nodeFS from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { CheSideCarFileSystem } from '../../src/common/che-protocol';
import { CheSideCarFileSystemImpl } from '../../src/plugin/che-sidecar-file-system';
import { FileType } from '@theia/filesystem/lib/common/files';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

import rimraf = require('rimraf');

describe('Test CheSideCarFileSystemImpl', () => {
  let fs: CheSideCarFileSystem;
  let workspace: string;

  beforeAll(() => {
    const machineName = 'test';
    process.env.CHE_MACHINE_NAME = machineName;

    const registerFileSystemMock = jest.fn();

    jest.doMock('@theia/plugin-ext/lib/common/rpc-protocol', () => ({
      getProxy: jest.fn(() => ({
        $registerFileSystemProvider: registerFileSystemMock,
      })),
    }));
    const rpcProtocol = require('@theia/plugin-ext/lib/common/rpc-protocol') as RPCProtocol;
    fs = new CheSideCarFileSystemImpl(rpcProtocol);

    expect(registerFileSystemMock).toHaveBeenCalledTimes(1);
    expect(registerFileSystemMock).toHaveBeenCalledWith(`file-sidecar-${machineName}`);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    workspace = nodeFS.mkdtempSync(path.join(os.tmpdir(), 'CheSideCarFileSystemImpl-'));
  });

  afterEach(() => {
    rimraf.sync(workspace);
  });

  test('Should return file stat', async () => {
    const filePath = path.join(workspace, 'foo');
    const fileContent = 'content';

    nodeFS.writeFileSync(filePath, fileContent);

    const stat = await fs.$stat(filePath);

    expect(stat.type).toEqual(FileType.File);
    expect(stat.size).toEqual(fileContent.length);
  });

  test('Should throw an exception if file not found during stat call', async () => {
    const filePath = path.join(workspace, 'nonexistent');
    await expect(fs.$stat(filePath)).rejects.toThrow(`Error: ENOENT: no such file or directory, stat '${filePath}'`);
  });

  test('Should read file content', async () => {
    const filePath = path.join(workspace, 'foo');
    const fileContent = 'content';

    nodeFS.writeFileSync(filePath, fileContent);

    const binaryBuffer = await fs.$readFile(filePath);
    const expectedBuffer = BinaryBuffer.wrap(Buffer.from(fileContent));

    expect(binaryBuffer).toEqual(expectedBuffer);
  });

  test('Should throw an exception if file not found during read file content', async () => {
    const filePath = path.join(workspace, 'nonexistent');
    await expect(fs.$readFile(filePath)).rejects.toThrow(
      `Error: ENOENT: no such file or directory, open '${filePath}'`
    );
  });

  test('Should throw an exception that file does not exist if create set to false and overwrite to true during write to file', async () => {
    const filePath = path.join(workspace, 'foo');
    await expect(
      fs.$writeFile(filePath, BinaryBuffer.wrap(Buffer.from('content')), { create: false, overwrite: true })
    ).rejects.toThrow(`File does not exist`);
  });

  test('Should throw an exception that file does not exist if create set to false and overwrite to false during write to file', async () => {
    const filePath = path.join(workspace, 'foo');
    const fileContent = 'content';

    nodeFS.writeFileSync(filePath, fileContent);

    await expect(
      fs.$writeFile(filePath, BinaryBuffer.wrap(Buffer.from(fileContent)), { create: false, overwrite: false })
    ).rejects.toThrow(`File already exists`);
  });

  test('Should write the content to file', async () => {
    const filePath = path.join(workspace, 'foo');
    const fileContent = 'content';

    await fs.$writeFile(filePath, BinaryBuffer.wrap(Buffer.from(fileContent)), { create: true, overwrite: false });

    const expectedContent = nodeFS.readFileSync(filePath);

    expect(expectedContent).toEqual(Buffer.from(fileContent));
  });

  test('Should overwrite file content for file that already exists', async () => {
    const filePath = path.join(workspace, 'foo');
    const fileContent = 'content';
    const newFileContent = 'another content';

    nodeFS.writeFileSync(filePath, fileContent);

    await fs.$writeFile(filePath, BinaryBuffer.wrap(Buffer.from(newFileContent)), { create: false, overwrite: true });

    const expectedContent = nodeFS.readFileSync(filePath);

    expect(expectedContent).toEqual(Buffer.from(newFileContent));
  });

  test('Should throw an exception if call write file on folder', async () => {
    const folderPath = path.join(workspace, 'folder');
    nodeFS.mkdirSync(folderPath);

    await expect(
      fs.$writeFile(folderPath, BinaryBuffer.wrap(Buffer.from('content')), { create: false, overwrite: true })
    ).rejects.toThrow(`Error: EISDIR: illegal operation on a directory, open '${folderPath}'`);
  });

  test('Should delete file', async () => {
    const filePath = path.join(workspace, 'foo');

    nodeFS.writeFileSync(filePath, '');

    await fs.$delete(filePath, { recursive: false, useTrash: false });

    const fileExists = nodeFS.existsSync(filePath);

    expect(fileExists).toBeFalsy();
  });

  test('Should throw an exception if file tries to be deleted twice', async () => {
    const filePath = path.join(workspace, 'foo');

    nodeFS.writeFileSync(filePath, '');

    await fs.$delete(filePath, { recursive: false, useTrash: false });
    await expect(fs.$delete(filePath, { recursive: false, useTrash: false })).rejects.toThrow(
      `Error: ENOENT: no such file or directory, unlink '${filePath}'`
    );
  });

  test('Should refuse delete the root', async () => {
    await expect(fs.$delete('/', { recursive: true, useTrash: false })).rejects.toThrow(
      'Error: rimraf - will refuse to recursively delete root'
    );
  });

  test('Should delete folder recursively', async () => {
    const folderPath = path.join(workspace, 'folder');
    const filePath1 = path.join(folderPath, 'file1');
    const filePath2 = path.join(folderPath, 'file2');

    nodeFS.mkdirSync(folderPath);
    nodeFS.writeFileSync(filePath1, '');
    nodeFS.writeFileSync(filePath2, '');

    await fs.$delete(folderPath, { recursive: true, useTrash: false });

    const folderExists = nodeFS.existsSync(folderPath);

    expect(folderExists).toBeFalsy();
  });

  test('Should remove only link to the folder', async () => {
    const folderPath = path.join(workspace, 'folder');
    const linkPath = path.join(workspace, 'folderLink');

    nodeFS.mkdirSync(folderPath);
    nodeFS.symlinkSync(folderPath, linkPath, 'dir');

    await fs.$delete(linkPath, { recursive: true, useTrash: false });
    const folderExists = nodeFS.existsSync(folderPath);
    const linkExists = nodeFS.existsSync(linkPath);

    expect(folderExists).toBeTruthy();
    expect(linkExists).toBeFalsy();
  });

  test('Should do nothing if file tries to rename to the same path', async () => {
    const filePath = path.join(workspace, 'foo');

    await fs.$rename(filePath, filePath, { overwrite: false });
  });

  test('Should rename file to the target', async () => {
    const sourcePath = path.join(workspace, 'foo');
    const targetPath = path.join(workspace, 'bar');

    nodeFS.writeFileSync(sourcePath, '');

    await fs.$rename(sourcePath, targetPath, { overwrite: false });

    const sourceExists = nodeFS.existsSync(sourcePath);
    const targetExists = nodeFS.existsSync(targetPath);

    expect(sourceExists).toBeFalsy();
    expect(targetExists).toBeTruthy();
  });

  test('Should rename file to the target and overwrite it', async () => {
    const sourcePath = path.join(workspace, 'foo');
    const targetPath = path.join(workspace, 'bar');
    const sourceContent = 'one';
    const targetContent = 'second';

    nodeFS.writeFileSync(sourcePath, sourceContent);
    nodeFS.writeFileSync(targetPath, targetContent);

    await fs.$rename(sourcePath, targetPath, { overwrite: true });

    const sourceExists = nodeFS.existsSync(sourcePath);
    const targetExists = nodeFS.existsSync(targetPath);

    expect(sourceExists).toBeFalsy();
    expect(targetExists).toBeTruthy();

    const targetExpectedContent = nodeFS.readFileSync(targetPath);

    expect(targetExpectedContent).toEqual(Buffer.from(sourceContent));
  });

  test('Should throw an exception if target file already exists during rename', async () => {
    const sourcePath = path.join(workspace, 'foo');
    const targetPath = path.join(workspace, 'bar');

    nodeFS.writeFileSync(sourcePath, '');
    nodeFS.writeFileSync(targetPath, '');

    await expect(fs.$rename(sourcePath, targetPath, { overwrite: false })).rejects.toThrow(
      'File at target already exists'
    );
  });

  test('Should rename folder to the target', async () => {
    const sourceFolder = path.join(workspace, 'sourceFolder');
    const targetFolder = path.join(workspace, 'targetFolder');

    nodeFS.mkdirSync(sourceFolder);

    await fs.$rename(sourceFolder, targetFolder, { overwrite: false });

    const sourceExists = nodeFS.existsSync(sourceFolder);
    const targetExists = nodeFS.existsSync(targetFolder);

    expect(sourceExists).toBeFalsy();
    expect(targetExists).toBeTruthy();
  });

  test('Should rewrite target directory during rename', async () => {
    const sourceFolder = path.join(workspace, 'sourceFolder');
    const targetFolder = path.join(workspace, 'targetFolder');

    const sourceFile = path.join(sourceFolder, 'foo');
    const targetFile = path.join(targetFolder, 'bar');

    nodeFS.mkdirSync(sourceFolder);
    nodeFS.mkdirSync(targetFolder);
    nodeFS.writeFileSync(sourceFile, '');
    nodeFS.writeFileSync(targetFile, '');

    await fs.$rename(sourceFolder, targetFolder, { overwrite: true });

    const sourceFileExists = nodeFS.existsSync(sourceFile);
    const targetFileExists = nodeFS.existsSync(targetFile);

    expect(sourceFileExists).toBeFalsy();
    expect(targetFileExists).toBeFalsy();
  });

  test('Should throw an exception if source file does not exists during rename', async () => {
    const nonExistedSourceFile = path.join(workspace, 'foo');
    const nonExistedTargetFile = path.join(workspace, 'bar');

    await expect(fs.$rename(nonExistedSourceFile, nonExistedTargetFile, { overwrite: false })).rejects.toThrow(
      `Error: ENOENT: no such file or directory, rename '${nonExistedSourceFile}' -> '${nonExistedTargetFile}'`
    );
  });

  test('Should copy source file into target', async () => {
    const sourceFile = path.join(workspace, 'foo');
    const targetFile = path.join(workspace, 'bar');

    const sourceFileContent = 'one';

    nodeFS.writeFileSync(sourceFile, sourceFileContent);

    await fs.$copy(sourceFile, targetFile, { overwrite: false });

    const targetExpectedContent = nodeFS.readFileSync(targetFile);

    expect(targetExpectedContent).toEqual(Buffer.from(sourceFileContent));
  });

  test('Should copy source file into target and overwrite it', async () => {
    const sourceFile = path.join(workspace, 'foo');
    const targetFile = path.join(workspace, 'bar');

    const sourceFileContent = 'one';
    const targetFileContent = 'second';

    nodeFS.writeFileSync(sourceFile, sourceFileContent);
    nodeFS.writeFileSync(targetFile, targetFileContent);

    await fs.$copy(sourceFile, targetFile, { overwrite: true });

    const targetExpectedContent = nodeFS.readFileSync(targetFile);

    expect(targetExpectedContent).toEqual(Buffer.from(sourceFileContent));
  });

  test('Should throw an exception if target file already exists during copy', async () => {
    const sourceFile = path.join(workspace, 'foo');
    const targetFile = path.join(workspace, 'bar');

    nodeFS.writeFileSync(sourceFile, '');
    nodeFS.writeFileSync(targetFile, '');

    await expect(fs.$copy(sourceFile, targetFile, { overwrite: false })).rejects.toThrow(
      `File at target already exists`
    );
  });

  test('Should throw an exception if source file does not exists during copy', async () => {
    const nonExistedSourceFile = path.join(workspace, 'foo');
    const nonExistedTargetFile = path.join(workspace, 'bar');

    await expect(fs.$copy(nonExistedSourceFile, nonExistedTargetFile, { overwrite: false })).rejects.toThrow(
      `Error: ENOENT: no such file or directory, stat '${nonExistedSourceFile}'`
    );
  });

  test('Should do nothing if file tries to copy to the same path', async () => {
    const filePath = path.join(workspace, 'foo');

    await fs.$copy(filePath, filePath, { overwrite: false });
  });

  test('Should copy folder to the target', async () => {
    const sourceFolder = path.join(workspace, 'src');
    const targetFolder = path.join(workspace, 'target');

    const sourceFile = path.join(sourceFolder, 'foo');
    const targetFile = path.join(targetFolder, 'bar');

    nodeFS.mkdirSync(sourceFolder);
    nodeFS.mkdirSync(targetFolder);
    nodeFS.writeFileSync(sourceFile, '');
    nodeFS.writeFileSync(targetFile, '');

    await fs.$copy(sourceFolder, targetFolder, { overwrite: true });

    const expectedTargetExists = nodeFS.existsSync(targetFolder);
    const expectedSourceInTargetExists = nodeFS.existsSync(path.join(workspace, 'target', 'foo'));

    expect(expectedTargetExists).toBeTruthy();
    expect(expectedSourceInTargetExists).toBeTruthy();
  });

  test('Should create a folder', async () => {
    const folderPath = path.join(workspace, 'foo');

    await fs.$mkdir(folderPath);

    const folderExists = nodeFS.existsSync(folderPath);

    expect(folderExists).toBeTruthy();
  });

  test('Should throw an exception during if parent folder does not exists during folder create', async () => {
    const folderPath = path.join(workspace, 'nonexistent/folder');

    await expect(fs.$mkdir(folderPath)).rejects.toThrow(
      `Error: ENOENT: no such file or directory, mkdir '${folderPath}'`
    );
  });

  test('Should read directory content', async () => {
    const sourceFolder = path.join(workspace, 'foo');
    const file1 = path.join(sourceFolder, 'file1');
    const file2 = path.join(sourceFolder, 'file2');
    const file3 = path.join(sourceFolder, 'file3');
    const folder1 = path.join(sourceFolder, 'folder1');
    const folder2 = path.join(sourceFolder, 'folder2');
    const symLink1 = path.join(sourceFolder, 'link1');

    nodeFS.mkdirSync(sourceFolder);
    nodeFS.mkdirSync(folder1);
    nodeFS.symlinkSync(folder2, symLink1);
    nodeFS.writeFileSync(file1, '');
    nodeFS.writeFileSync(file2, '');
    nodeFS.writeFileSync(file3, '');

    const directoryContent = await fs.$readdir(sourceFolder);

    expect(directoryContent.length).toEqual(5);
    expect(directoryContent).toContainEqual(['file1', FileType.File]);
    expect(directoryContent).toContainEqual(['file2', FileType.File]);
    expect(directoryContent).toContainEqual(['file3', FileType.File]);
    expect(directoryContent).toContainEqual(['folder1', FileType.Directory]);
    expect(directoryContent).toContainEqual(['link1', FileType.SymbolicLink]);
  });

  test('Should throw an exception during read non existent folder content', async () => {
    const nonExistentSourceFolder = path.join(workspace, 'nonexistent');

    await expect(fs.$readdir(nonExistentSourceFolder)).rejects.toThrow(
      `Error: ENOENT: no such file or directory, scandir '${nonExistentSourceFolder}'`
    );
  });
});
