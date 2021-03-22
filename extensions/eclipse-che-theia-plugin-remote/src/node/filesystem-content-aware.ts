/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { FileSystemExtImpl } from '@theia/plugin-ext/lib/plugin/file-system-ext-impl';
import { Uri } from '@theia/plugin';
import { overrideUri } from './che-content-aware-utils';

export class FileSystemContentAware {
  static makeFileSystemContentAware(fileSystemExt: FileSystemExtImpl): void {
    const fileSystemContentAware = new FileSystemContentAware();
    fileSystemContentAware.overrideVSCodeResourceScheme(fileSystemExt);
  }

  overrideVSCodeResourceScheme(fileSystemExt: FileSystemExtImpl): void {
    this.override$stat(fileSystemExt);
    this.override$readdir(fileSystemExt);
    this.override$readFile(fileSystemExt);
    this.override$writeFile(fileSystemExt);
    this.override$rename(fileSystemExt);
    this.override$copy(fileSystemExt);
    this.override$mkdir(fileSystemExt);
    this.override$delete(fileSystemExt);
  }

  protected override$stat(fileSystemExt: FileSystemExtImpl): void {
    const original$stat = fileSystemExt.fileSystem.stat.bind(fileSystemExt);
    fileSystemExt.fileSystem.stat = (uri: Uri) => original$stat(overrideUri(uri));
  }

  protected override$readdir(fileSystemExt: FileSystemExtImpl): void {
    const original$readdir = fileSystemExt.fileSystem.readDirectory.bind(fileSystemExt);
    fileSystemExt.fileSystem.readDirectory = (uri: Uri) => original$readdir(overrideUri(uri));
  }

  protected override$readFile(fileSystemExt: FileSystemExtImpl): void {
    const original$readFile = fileSystemExt.fileSystem.readFile.bind(fileSystemExt);
    fileSystemExt.fileSystem.readFile = (uri: Uri) => original$readFile(overrideUri(uri));
  }

  protected override$writeFile(fileSystemExt: FileSystemExtImpl): void {
    const original$writeFile = fileSystemExt.fileSystem.writeFile.bind(fileSystemExt);
    fileSystemExt.fileSystem.writeFile = (uri: Uri, content: Uint8Array) =>
      original$writeFile(overrideUri(uri), content);
  }

  protected override$rename(fileSystemExt: FileSystemExtImpl): void {
    const original$rename = fileSystemExt.fileSystem.rename.bind(fileSystemExt);
    fileSystemExt.fileSystem.rename = (source: Uri, target: Uri, options?: { overwrite?: boolean }) =>
      original$rename(overrideUri(source), overrideUri(target), options);
  }

  protected override$copy(fileSystemExt: FileSystemExtImpl): void {
    const original$copy = fileSystemExt.fileSystem.copy.bind(fileSystemExt);
    fileSystemExt.fileSystem.copy = (source: Uri, target: Uri, options?: { overwrite?: boolean }) =>
      original$copy(overrideUri(source), overrideUri(target), options);
  }

  protected override$mkdir(fileSystemExt: FileSystemExtImpl): void {
    const original$mkdir = fileSystemExt.fileSystem.createDirectory.bind(fileSystemExt);
    fileSystemExt.fileSystem.createDirectory = (uri: Uri) => original$mkdir(overrideUri(uri));
  }

  protected override$delete(fileSystemExt: FileSystemExtImpl): void {
    const original$delete = fileSystemExt.fileSystem.delete.bind(fileSystemExt);
    fileSystemExt.fileSystem.delete = (uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }) =>
      original$delete(overrideUri(uri), options);
  }
}
