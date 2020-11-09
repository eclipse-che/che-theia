/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ContainerModule } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { CheTheiaUserPreferencesSynchronizer } from './che-theia-preferences-synchronizer';
import { CheTheiaPreferencesContribution } from './che-theia-preferences-contribution';
import { StorageServer, storageServerPath } from '../common/storage-server';
import { CheStorageServer } from './che-storage-server';
import { JsonRpcConnectionHandler, ConnectionHandler } from '@theia/core/lib/common/messaging';

export default new ContainerModule(bind => {
    bind(CheTheiaUserPreferencesSynchronizer).toSelf().inSingletonScope();

    bind(CheTheiaPreferencesContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(CheTheiaPreferencesContribution);

    bind(CheStorageServer).toSelf().inSingletonScope();
    bind(StorageServer).toService(CheStorageServer);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(storageServerPath, () =>
            ctx.container.get(StorageServer)
        )
    ).inSingletonScope();
});
