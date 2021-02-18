/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Disposable, Emitter, Event } from '@theia/core';
import {
  FileChange,
  FileDeleteOptions,
  FileOverwriteOptions,
  FileSystemProvider,
  FileSystemProviderCapabilities,
  FileType,
  FileWriteOptions,
  Stat,
  WatchOptions,
} from '@theia/filesystem/lib/common/files';
import { FileService, FileServiceContribution } from '@theia/filesystem/lib/browser/file-service';

import { ChePluginUri } from '../common/che-plugin-uri';
import URI from '@theia/core/lib/common/uri';

/**
 * A very basic file system provider that can read and write
 * via a resource interface.
 */
export class ChePluginFileSystem implements FileSystemProvider {
  private readonly _onDidChange = new Emitter<readonly FileChange[]>();

  readonly onDidChangeFile: Event<readonly FileChange[]> = this._onDidChange.event;
  readonly onFileWatchError: Event<void> = new Emitter<void>().event;

  readonly capabilities: FileSystemProviderCapabilities;
  readonly onDidChangeCapabilities: Event<void> = Event.None;

  constructor() {
    this.capabilities = FileSystemProviderCapabilities.Readonly;
  }

  delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
    throw new Error('Not implemented.');
  }

  mkdir(resource: URI): Promise<void> {
    throw new Error('Not implemented.');
  }

  readFile(resource: URI): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.responseType = 'arraybuffer';
      request.onreadystatechange = function (): void {
        if (this.readyState === XMLHttpRequest.DONE) {
          if (this.status === 200) {
            resolve(new Uint8Array(this.response));
          } else {
            reject(new Error('Could not fetch plugin resource'));
          }
        }
      };

      request.open('GET', resource.toString(), true);
      request.send();
    });
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
}

export class ChePluginFileServiceContribution implements FileServiceContribution {
  registerFileSystemProviders(service: FileService): void {
    service.onWillActivateFileSystemProvider(event => {
      if (event.scheme === ChePluginUri.SCHEME) {
        event.waitUntil(
          (async () => {
            service.registerProvider(ChePluginUri.SCHEME, new ChePluginFileSystem());
          })()
        );
      }
    });
  }
}
