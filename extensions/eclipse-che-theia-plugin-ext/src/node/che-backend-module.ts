/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ContainerModule } from 'inversify';
import { ChePluginApiProvider } from './che-plugin-api-provider';
import { ExtPluginApiProvider } from '@theia/plugin-ext';
import { ChePluginApiContribution } from './che-plugin-script-service';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';
import {
    CHE_API_SERVICE_PATH,
    CHE_TASK_SERVICE_PATH,
    CHE_PRODUCT_SERVICE_PATH,
    CheApiService,
    CheTaskClient,
    CheTaskService,
    CheProductService
} from '../common/che-protocol';
import {
    CHE_PLUGIN_SERVICE_PATH,
    ChePluginService,
    ChePluginServiceClient
} from '../common/che-plugin-protocol';
import { CheApiServiceImpl } from './che-api-service';
import { CheTaskServiceImpl } from './che-task-service';
import { ChePluginServiceImpl } from './che-plugin-service';
import { CheProductServiceImpl } from './che-product-service';

export default new ContainerModule(bind => {
    bind(ChePluginApiProvider).toSelf().inSingletonScope();
    bind(Symbol.for(ExtPluginApiProvider)).toService(ChePluginApiProvider);

    bind(ChePluginApiContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(ChePluginApiContribution);

    bind(CheApiService).to(CheApiServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(CHE_API_SERVICE_PATH, () =>
            ctx.container.get(CheApiService)
        )
    ).inSingletonScope();

    bind(CheTaskService).toDynamicValue(ctx => new CheTaskServiceImpl(ctx.container)).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<CheTaskClient>(CHE_TASK_SERVICE_PATH, client => {
            const server: CheTaskService = ctx.container.get(CheTaskService);
            server.setClient(client);
            client.onDidCloseConnection(() => server.disconnectClient(client));
            return server;
        })
    ).inSingletonScope();

    bind(ChePluginService).toDynamicValue(ctx => new ChePluginServiceImpl(ctx.container)).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<ChePluginServiceClient>(CHE_PLUGIN_SERVICE_PATH, client => {
            const server: ChePluginService = ctx.container.get(ChePluginService);
            server.setClient(client);
            client.onDidCloseConnection(() => server.disconnectClient(client));
            return server;
        })
    ).inSingletonScope();

    bind(CheProductService).to(CheProductServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(CHE_PRODUCT_SERVICE_PATH, () =>
            ctx.container.get(CheProductService)
        )
    ).inSingletonScope();

});
