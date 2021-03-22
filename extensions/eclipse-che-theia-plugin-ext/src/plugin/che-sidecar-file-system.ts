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
  FileDeleteOptions,
  FileOpenOptions,
  FileOverwriteOptions,
  FileSystemProviderError,
  FileSystemProviderErrorCode,
  FileType,
  FileWriteOptions,
  Stat,
  createFileSystemProviderError,
} from '@theia/filesystem/lib/common/files';
import {
  Stats,
  chmod,
  close,
  createReadStream,
  createWriteStream,
  exists,
  fdatasync,
  futimes,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rmdir,
  stat,
  unlink,
  write,
} from 'fs';
import { dirname, join } from 'path';

import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { Path } from '@theia/core/lib/common/path';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { URI } from 'vscode-uri';
import { promisify } from 'util';
import { retry } from '@theia/core/lib/common/promise-util';

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
  private mapHandleToPos: Map<number, number> = new Map();
  private writeHandles: Set<number> = new Set();
  private canFlush: boolean = true;

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

  async $writeFile(resource: string, content: BinaryBuffer, opts: FileWriteOptions): Promise<void> {
    let handle: number | undefined = undefined;
    try {
      // Validate target unless { create: true, overwrite: true }
      if (!opts.create || !opts.overwrite) {
        const fileExists = await promisify(exists)(resource);
        if (fileExists) {
          if (!opts.overwrite) {
            throw createFileSystemProviderError('File already exists', FileSystemProviderErrorCode.FileExists);
          }
        } else {
          if (!opts.create) {
            throw createFileSystemProviderError('File does not exist', FileSystemProviderErrorCode.FileNotFound);
          }
        }
      }

      // Open
      handle = await this.open(resource, { create: true });

      // Write content at once
      await this.write(handle, 0, content.buffer, 0, content.byteLength);
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    } finally {
      if (typeof handle === 'number') {
        await this.close(handle);
      }
    }
  }

  async write(fd: number, pos: number, data: Uint8Array, offset: number, length: number): Promise<number> {
    // we know at this point that the file to write to is truncated and thus empty
    // if the write now fails, the file remains empty. as such we really try hard
    // to ensure the write succeeds by retrying up to three times.
    return retry(() => this.doWrite(fd, pos, data, offset, length), 100 /* ms delay */, 3 /* retries */);
  }

  private async doWrite(fd: number, pos: number, data: Uint8Array, offset: number, length: number): Promise<number> {
    const normalizedPos = this.normalizePos(fd, pos);

    let bytesWritten: number | undefined = undefined;
    try {
      const result = await promisify(write)(fd, data, offset, length, normalizedPos);

      if (typeof result === 'number') {
        bytesWritten = result; // node.d.ts fail
      } else {
        bytesWritten = result.bytesWritten;
      }

      return bytesWritten;
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    } finally {
      this.updatePos(fd, normalizedPos, bytesWritten);
    }
  }

  private normalizePos(fd: number, pos: number): number | undefined {
    // when calling fs.read/write we try to avoid passing in the "pos" argument and
    // rather prefer to pass in "null" because this avoids an extra seek(pos)
    // call that in some cases can even fail (e.g. when opening a file over FTP -
    // see https://github.com/microsoft/vscode/issues/73884).
    //
    // as such, we compare the passed in position argument with our last known
    // position for the file descriptor and use "null" if they match.
    if (pos === this.mapHandleToPos.get(fd)) {
      return undefined;
    }

    return pos;
  }

  private updatePos(fd: number, pos: number | undefined, bytesLength: number | undefined): void {
    const lastKnownPos = this.mapHandleToPos.get(fd);
    if (typeof lastKnownPos === 'number') {
      // pos !== null signals that previously a position was used that is
      // not null. node.js documentation explains, that in this case
      // the internal file pointer is not moving and as such we do not move
      // our position pointer.
      //
      // Docs: "If position is null, data will be read from the current file position,
      // and the file position will be updated. If position is an integer, the file position
      // will remain unchanged."
      if (typeof pos === 'number') {
        // do not modify the position
      } else if (typeof bytesLength === 'number') {
        this.mapHandleToPos.set(fd, lastKnownPos + bytesLength);
      } else {
        this.mapHandleToPos.delete(fd);
      }
    }
  }

  async open(resource: string, opts: FileOpenOptions): Promise<number> {
    try {
      let flags: string | undefined = undefined;
      if (opts.create) {
        // we take opts.create as a hint that the file is opened for writing
        // as such we use 'w' to truncate an existing or create the
        // file otherwise. we do not allow reading.
        if (!flags) {
          flags = 'w';
        }
      } else {
        // otherwise we assume the file is opened for reading
        // as such we use 'r' to neither truncate, nor create
        // the file.
        flags = 'r';
      }

      const handle = await promisify(open)(resource, flags);

      // remember this handle to track file position of the handle
      // we init the position to 0 since the file descriptor was
      // just created and the position was not moved so far (see
      // also http://man7.org/linux/man-pages/man2/open.2.html -
      // "The file offset is set to the beginning of the file.")
      this.mapHandleToPos.set(handle, 0);

      // remember that this handle was used for writing
      if (opts.create) {
        this.writeHandles.add(handle);
      }

      return handle;
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  async close(fd: number): Promise<void> {
    try {
      // remove this handle from map of positions
      this.mapHandleToPos.delete(fd);

      // if a handle is closed that was used for writing, ensure
      // to flush the contents to disk if possible.
      if (this.writeHandles.delete(fd) && this.canFlush) {
        try {
          await promisify(fdatasync)(fd);
        } catch (error) {
          // In some exotic setups it is well possible that node fails to sync
          // In that case we disable flushing and log the error to our logger
          this.canFlush = false;
          console.error(error);
        }
      }

      return await promisify(close)(fd);
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  async $delete(resource: string, opts: FileDeleteOptions): Promise<void> {
    try {
      await this.doDelete(resource, opts);
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  protected async doDelete(filePath: string, opts: FileDeleteOptions): Promise<void> {
    if (opts.useTrash) {
      // we don't support this option, so show information about using trash option in container
    }

    if (opts.recursive) {
      await this.rimraf(filePath);
    } else {
      await promisify(unlink)(filePath);
    }
  }

  protected async rimraf(path: string): Promise<void> {
    if (new Path(path).isRoot) {
      throw new Error('rimraf - will refuse to recursively delete root');
    }
    return await this.rimrafUnlink(path);
  }

  protected async rimrafUnlink(path: string): Promise<void> {
    const rawStat = await promisify(lstat)(path);

    // Folder delete (recursive) - NOT for symbolic links though!
    if (rawStat.isDirectory() && !rawStat.isSymbolicLink()) {
      // Children
      const children = await promisify(readdir)(path);
      await Promise.all(children.map(child => this.rimrafUnlink(join(path, child))));

      // Folder
      await promisify(rmdir)(path);
    } else {
      // chmod as needed to allow for unlink
      const mode = rawStat.mode;
      if (!(mode & 128)) {
        // 128 === 0200
        await promisify(chmod)(path, mode | 128);
      }

      return promisify(unlink)(path);
    }
  }

  async $rename(from: string, to: string, opts: FileOverwriteOptions): Promise<void> {
    if (from === to) {
      return; // simulate node.js behaviour here and do a no-op if paths match
    }

    try {
      // Ensure target does not exist
      await this.validateTargetDeleted(to, opts.overwrite);

      // Move
      await this.move(from, to);
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  protected async move(source: string, target: string): Promise<void> {
    async function updateMtime(path: string): Promise<void> {
      const rawStat = await promisify(lstat)(path);
      if (rawStat.isDirectory() || rawStat.isSymbolicLink()) {
        return Promise.resolve(); // only for files
      }

      const fd = await promisify(open)(path, 'a');
      try {
        await promisify(futimes)(fd, rawStat.atime, new Date());
      } catch (error) {
        // ignore
      }

      return promisify(close)(fd);
    }

    await promisify(rename)(source, target);
    await updateMtime(target);
  }

  async $copy(from: string, to: string, opts: FileOverwriteOptions): Promise<void> {
    if (from === to) {
      return; // simulate node.js behaviour here and do a no-op if paths match
    }

    try {
      // Ensure target does not exist
      await this.validateTargetDeleted(to, opts.overwrite);

      // Copy
      await this.doCopy(from, to);
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  private async validateTargetDeleted(to: string, overwrite?: boolean): Promise<void> {
    if (await promisify(exists)(to)) {
      if (!overwrite) {
        throw createFileSystemProviderError('File at target already exists', FileSystemProviderErrorCode.FileExists);
      }

      // Delete target
      await this.$delete(to, { recursive: true, useTrash: false });
    }
  }

  protected async doCopy(source: string, target: string, copiedSourcesIn?: { [path: string]: boolean }): Promise<void> {
    const copiedSources = copiedSourcesIn ? copiedSourcesIn : {};

    const fileStat = await promisify(stat)(source);
    if (!fileStat.isDirectory()) {
      return this.doCopyFile(source, target, fileStat.mode & 511);
    }

    if (copiedSources[source]) {
      return Promise.resolve(); // escape when there are cycles (can happen with symlinks)
    }

    copiedSources[source] = true; // remember as copied

    // Create folder
    await this.mkdirp(target, fileStat.mode & 511);

    // Copy each file recursively
    const files = await promisify(readdir)(source);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await this.doCopy(join(source, file), join(target, file), copiedSources);
    }
  }

  protected async mkdirp(path: string, mode?: number): Promise<void> {
    const doMkdir = async () => {
      try {
        await promisify(mkdir)(path, mode);
      } catch (error) {
        // ENOENT: a parent folder does not exist yet
        if (error.code === 'ENOENT') {
          throw error;
        }

        // Any other error: check if folder exists and
        // return normally in that case if its a folder
        let targetIsFile = false;
        try {
          const fileStat = await promisify(stat)(path);
          targetIsFile = !fileStat.isDirectory();
        } catch (statError) {
          throw error; // rethrow original error if stat fails
        }

        if (targetIsFile) {
          throw new Error(`'${path}' exists and is not a directory.`);
        }
      }
    };

    // stop at root
    if (path === dirname(path)) {
      return;
    }

    try {
      await doMkdir();
    } catch (error) {
      // ENOENT: a parent folder does not exist yet, continue
      // to create the parent folder and then try again.
      if (error.code === 'ENOENT') {
        await this.mkdirp(dirname(path), mode);

        return doMkdir();
      }

      // Any other error
      throw error;
    }
  }

  protected doCopyFile(source: string, target: string, mode: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = createReadStream(source);
      const writer = createWriteStream(target, { mode });

      let finished = false;
      const finish = (error?: Error) => {
        if (!finished) {
          finished = true;

          // in error cases, pass to callback
          if (error) {
            return reject(error);
          }

          // we need to explicitly chmod because of https://github.com/nodejs/node/issues/1104
          chmod(target, mode, err => (err ? reject(err) : resolve()));
        }
      };

      // handle errors properly
      reader.once('error', error => finish(error));
      writer.once('error', error => finish(error));

      // we are done (underlying fd has been closed)
      writer.once('close', () => finish());

      // start piping
      reader.pipe(writer);
    });
  }

  async $mkdir(resource: string): Promise<void> {
    try {
      await promisify(mkdir)(resource);
    } catch (error) {
      throw this.toFileSystemProviderError(error);
    }
  }

  async $readdir(resource: string): Promise<[string, FileType][]> {
    try {
      const children = await promisify(readdir)(resource);

      const result: [string, FileType][] = [];
      await Promise.all(
        children.map(async child => {
          try {
            const rawStat = await this.$stat(join(resource, child));
            result.push([child, rawStat.type]);
          } catch (error) {
            console.trace(error); // ignore errors for individual entries that can arise from permission denied
          }
        })
      );

      return result;
    } catch (error) {
      throw this.toFileSystemProviderError(error);
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
