/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { FrontendApplicationContribution, StorageService, WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { StorageServer, storageServerPath } from '../common/storage-server';

import { CheStorageService } from './che-storage-service';
import { ContainerModule } from 'inversify';
import { LayoutChangeListener } from './che-storage-frontend-contribution';
import { TheiaThemePreferenceSynchronizer } from './theme/theme-synchronizer';
import { bindStorageServicePreferences } from './che-storage-preferences';
import { bindTheiaThemePreferences } from './theme/theme-preferences';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bindTheiaThemePreferences(bind);
  bindStorageServicePreferences(bind);
  bind(FrontendApplicationContribution).to(TheiaThemePreferenceSynchronizer).inSingletonScope();
  bind(FrontendApplicationContribution).to(LayoutChangeListener).inSingletonScope();

  bind(StorageServer)
    .toDynamicValue(ctx => {
      const connection = ctx.container.get(WebSocketConnectionProvider);
      return connection.createProxy<StorageServer>(storageServerPath);
    })
    .inSingletonScope();

  bind(CheStorageService).toSelf().inSingletonScope();
  rebind(StorageService).toService(CheStorageService);
});
