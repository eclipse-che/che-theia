/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheSideCarFileSystem, CheSideCarFileSystemMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { Disposable, Emitter, Event } from '@theia/core/lib/common';
import {
  FileChange,
  FileDeleteOptions,
  FileOverwriteOptions,
  FileSystemProviderCapabilities,
  FileSystemProviderWithFileFolderCopyCapability,
  FileSystemProviderWithFileReadWriteCapability,
  FileType,
  FileWriteOptions,
  Stat,
  WatchOptions,
} from '@theia/filesystem/lib/common/files';

import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import URI from '@theia/core/lib/common/uri';
import { interfaces } from 'inversify';

export abstract class AbstractSideCarFileSystemProvider
  implements FileSystemProviderWithFileReadWriteCapability, FileSystemProviderWithFileFolderCopyCapability
{
  private readonly _onDidChange = new Emitter<readonly FileChange[]>();

  readonly onDidChangeFile: Event<readonly FileChange[]> = this._onDidChange.event;
  readonly onFileWatchError: Event<void> = new Emitter<void>().event;

  readonly capabilities: FileSystemProviderCapabilities;
  readonly onDidChangeCapabilities: Event<void> = Event.None;

  protected constructor(capabilities: FileSystemProviderCapabilities) {
    this.capabilities = capabilities;
  }

  delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
    throw new Error('Not implemented.');
  }

  mkdir(resource: URI): Promise<void> {
    throw new Error('Not implemented.');
  }

  readFile(resource: URI): Promise<Uint8Array> {
    throw new Error('Not implemented.');
  }

  readdir(resource: URI): Promise<[string, FileType][]> {
    throw new Error('Not implemented.');
  }

  rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
    throw new Error('Not implemented.');
  }

  stat(resource: URI): Promise<Stat> {
    throw new Error('Not implemented.');
  }

  watch(resource: URI, opts: WatchOptions): Disposable {
    throw new Error('Not implemented.');
  }

  writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> {
    throw new Error('Not implemented.');
  }

  copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
    throw new Error('Not implemented.');
  }
}

export class CheSideCarFileSystemMainImpl implements CheSideCarFileSystemMain {
  private readonly delegate: CheSideCarFileSystem;
  private readonly fileService: FileService;

  constructor(container: interfaces.Container, rpc: RPCProtocol) {
    this.delegate = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_SIDECAR_FILE_SYSTEM);
    this.fileService = container.get(FileService);
  }

  $registerFileSystemProvider(scheme: string): Promise<void> {
    const provider = new CheSideCarFileSystemProvider(
      this.delegate,
      FileSystemProviderCapabilities.FileReadWrite | FileSystemProviderCapabilities.FileFolderCopy
    );
    this.fileService.registerProvider(scheme, provider);
    return Promise.resolve(undefined);
  }
}

export class CheSideCarFileSystemProvider extends AbstractSideCarFileSystemProvider {
  private readonly delegate: CheSideCarFileSystem;

  constructor(delegate: CheSideCarFileSystem, capabilities: FileSystemProviderCapabilities) {
    super(capabilities);
    this.delegate = delegate;
  }

  async stat(resource: URI): Promise<Stat> {
    return await this.delegate.$stat(resource.path.toString());
  }

  async readFile(resource: URI): Promise<Uint8Array> {
    return (await this.delegate.$readFile(resource.path.toString())).buffer;
  }

  async writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> {
    return await this.delegate.$writeFile(resource.path.toString(), BinaryBuffer.wrap(content), opts);
  }

  async delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
    return await this.delegate.$delete(resource.path.toString(), opts);
  }

  async rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
    return await this.delegate.$rename(from.path.toString(), to.path.toString(), opts);
  }

  async copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
    return await this.delegate.$copy(from.path.toString(), to.path.toString(), opts);
  }

  async mkdir(resource: URI): Promise<void> {
    return await this.delegate.$mkdir(resource.path.toString());
  }

  async readdir(resource: URI): Promise<[string, FileType][]> {
    return await this.delegate.$readdir(resource.path.toString());
  }
}
