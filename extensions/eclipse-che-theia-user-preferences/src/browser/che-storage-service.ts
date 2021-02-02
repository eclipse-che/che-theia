/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable, postConstruct } from 'inversify';

import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { ILogger } from '@theia/core';
import { StorageService } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@theia/workspace/lib/browser';

@injectable()
export class CheStorageService implements StorageService {
  @inject(FileService)
  protected readonly fileService: FileService;

  @inject(EnvVariablesServer)
  protected readonly envVariableServer: EnvVariablesServer;

  @inject(WorkspaceService)
  protected readonly workspaceService: WorkspaceService;

  @inject(ILogger)
  protected readonly logger: ILogger;

  private prefix: string;
  protected initialized: Promise<void>;

  @postConstruct()
  protected init(): void {
    this.initialized = this.workspaceService.roots.then(async () => {
      await this.logger.info('Storage service initialized.');

      this.updatePrefix();
      this.workspaceService.onWorkspaceLocationChanged(() => this.updatePrefix());
    });
  }

  async setData<T>(key: string, data?: T): Promise<void> {
    if (!this.prefix) {
      await this.initialized;
    }

    await this.logger.info(`Write storage data for the key '${key}'.`);

    const keyPath = await this.getKeyPath(key);

    if (!data && (await this.fileService.exists(keyPath))) {
      await this.fileService.delete(keyPath);
      return Promise.resolve();
    }

    await this.fileService.writeFile(keyPath, BinaryBuffer.fromString(JSON.stringify(data)));

    return Promise.resolve();
  }

  async getData<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    if (!this.prefix) {
      await this.initialized;
    }

    await this.logger.info(`Request storage data for the key '${key}'.`);

    const keyPath = await this.getKeyPath(key);

    if (await this.fileService.exists(keyPath)) {
      const keyContent = await this.fileService.readFile(keyPath);

      return Promise.resolve(JSON.parse(keyContent.value.toString()));
    }

    return Promise.resolve(defaultValue);
  }

  private updatePrefix(): void {
    this.prefix = this.getPrefix(this.workspaceService.workspace);
  }

  protected getPrefix(workspaceStat: FileStat | undefined): string {
    return workspaceStat ? workspaceStat.resource.toString() : '_global_';
  }

  protected prefixWorkspaceURI(originalKey: string): string {
    return `${this.prefix}$${originalKey}`;
  }

  protected async getKeyPath(key: string): Promise<URI> {
    const configDirUri = await this.envVariableServer.getConfigDirUri();
    const prefixedKey = this.prefixWorkspaceURI(key).replace(/[\\/\\?<>\\\\:\\*\\|"]/g, '$');

    return new URI(configDirUri).resolve('storage').resolve(prefixedKey);
  }
}
