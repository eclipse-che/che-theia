/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { injectable, inject, postConstruct } from 'inversify';
import { StorageService } from '@theia/core/lib/browser';
import { StorageServer } from '../common/storage-server';
import { ILogger } from '@theia/core/lib/common/logger';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

@injectable()
export class CheStorageService implements StorageService {

    @inject(StorageServer)
    private storageServer: StorageServer;

    @inject(WorkspaceService)
    protected workspaceService: WorkspaceService;

    @inject(ILogger)
    protected logger: ILogger;

    private initialized: Promise<void>;

    @postConstruct()
    protected init(): void {
        this.initialized = this.workspaceService.roots.then(() => { });
    }

    async setData<T>(key: string, data?: T): Promise<void> {
        await this.initialized;
        return this.storageServer.setData(key, JSON.stringify(data));
    }

    async getData<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        await this.initialized;
        try {
            const data = await this.storageServer.getData(key);
            if (data === undefined) {
                return defaultValue;
            }
            return JSON.parse(data);
        } catch (e) {
            this.logger.warn(`Can't receive data for key:${key}, returning default value: ${defaultValue}`, e);
            return defaultValue;
        }

    }

}
