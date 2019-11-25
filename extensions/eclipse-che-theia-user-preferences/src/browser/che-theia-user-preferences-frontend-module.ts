/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { ContainerModule } from 'inversify';
import { bindTheiaThemePreferences } from './theme/theme-preferences';
import { FrontendApplicationContribution, WebSocketConnectionProvider, StorageService } from '@theia/core/lib/browser';
import { TheiaThemePreferenceSynchronizer } from './theme/theme-synchronizer';
import { StorageServer, storageServerPath } from '../common/storage-server';
import { CheStorageService } from './che-storage-service';
import { bindStorageServicePreferences } from './che-storage-preferences';
import { LayoutChangeListener } from './che-storage-frontend-contribution';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindTheiaThemePreferences(bind);
    bindStorageServicePreferences(bind);
    bind(FrontendApplicationContribution).to(TheiaThemePreferenceSynchronizer).inSingletonScope();
    bind(FrontendApplicationContribution).to(LayoutChangeListener).inSingletonScope();

    bind(StorageServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<StorageServer>(storageServerPath);
    }).inSingletonScope();

    bind(CheStorageService).toSelf().inSingletonScope();
    rebind(StorageService).toService(CheStorageService);
});
