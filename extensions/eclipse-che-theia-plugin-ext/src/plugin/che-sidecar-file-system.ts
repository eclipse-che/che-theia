/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { CheSideCarFileSystem, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import {
  FileSystemProviderError,
  FileSystemProviderErrorCode,
  FileType,
  Stat,
  createFileSystemProviderError,
} from '@theia/filesystem/lib/common/files';
import { Stats, lstat, readFile, stat } from 'fs';

import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { URI } from 'vscode-uri';
import { promisify } from 'util';

export namespace SideCarFileSystemProvider {
  export interface StatAndLink {
    // The stats of the file. If the file is a symbolic
    // link, the stats will be of that target file and
    // not the link itself.
    // If the file is a symbolic link pointing to a non
    // existing file, the stat will be of the link and
    // the `dangling` flag will indicate this.
    stat: Stats;

    // Will be provided if the resource is a symbolic link
    // on disk. Use the `dangling` flag to find out if it
    // points to a resource that does not exist on disk.
    symbolicLink?: { dangling: boolean };
  }
}

export class CheSideCarFileSystemImpl implements CheSideCarFileSystem {
  constructor(rpc: RPCProtocol) {
    const delegate = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_SIDECAR_FILE_SYSTEM_MAIN);
    const machineName = process.env.CHE_MACHINE_NAME;
    if (machineName) {
      delegate.$registerFileSystemProvider(`file-sidecar-${machineName}`);
    }
  }

  async $stat(resource: string): Promise<Stat> {
    try {
      const statAndLink = await this.statLink(resource); // cannot use fs.stat() here to support links properly

      return {
        type: this.toType(statAndLink.stat, statAndLink.symbolicLink),
        ctime: statAndLink.stat.birthtime.getTime(), // intentionally not using ctime here, we want the creation time
        mtime: statAndLink.stat.mtime.getTime(),
        size: statAndLink.stat.size,
      };
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  async $readFile(resource: string): Promise<BinaryBuffer> {
    const _uri = URI.parse(resource);
    try {
      return BinaryBuffer.wrap(await promisify(readFile)(_uri.fsPath, undefined));
    } catch (error) {
      return Promise.reject(this.toFileSystemProviderError(error));
    }
  }

  protected async statLink(path: string): Promise<SideCarFileSystemProvider.StatAndLink> {
    // First stat the link
    let lstats: Stats | undefined;
    try {
      lstats = await promisify(lstat)(path);

      // Return early if the stat is not a symbolic link at all
      if (!lstats.isSymbolicLink()) {
        return { stat: lstats };
      }
    } catch (error) {
      /* ignore - use stat() instead */
    }

    // If the stat is a symbolic link or failed to stat, use fs.stat()
    // which for symbolic links will stat the target they point to
    try {
      const stats = await promisify(stat)(path);

      return { stat: stats, symbolicLink: lstats?.isSymbolicLink() ? { dangling: false } : undefined };
    } catch (error) {
      // If the link points to a non-existing file we still want
      // to return it as result while setting dangling: true flag
      if (error.code === 'ENOENT' && lstats) {
        return { stat: lstats, symbolicLink: { dangling: true } };
      }

      throw error;
    }
  }

  private toType(entry: Stats, symbolicLink?: { dangling: boolean }): FileType {
    // Signal file type by checking for file / directory, except:
    // - symbolic links pointing to non-existing files are FileType.Unknown
    // - files that are neither file nor directory are FileType.Unknown
    let type: FileType;
    if (symbolicLink?.dangling) {
      type = FileType.Unknown;
    } else if (entry.isFile()) {
      type = FileType.File;
    } else if (entry.isDirectory()) {
      type = FileType.Directory;
    } else {
      type = FileType.Unknown;
    }

    // Always signal symbolic link as file type additionally
    if (symbolicLink) {
      type |= FileType.SymbolicLink;
    }

    return type;
  }

  private toFileSystemProviderError(error: NodeJS.ErrnoException): FileSystemProviderError {
    if (error instanceof FileSystemProviderError) {
      return error; // avoid double conversion
    }

    let code: FileSystemProviderErrorCode;
    switch (error.code) {
      case 'ENOENT':
        code = FileSystemProviderErrorCode.FileNotFound;
        break;
      case 'EISDIR':
        code = FileSystemProviderErrorCode.FileIsADirectory;
        break;
      case 'ENOTDIR':
        code = FileSystemProviderErrorCode.FileNotADirectory;
        break;
      case 'EEXIST':
        code = FileSystemProviderErrorCode.FileExists;
        break;
      case 'EPERM':
      case 'EACCES':
        code = FileSystemProviderErrorCode.NoPermissions;
        break;
      default:
        code = FileSystemProviderErrorCode.Unknown;
    }

    return createFileSystemProviderError(error, code);
  }
}
