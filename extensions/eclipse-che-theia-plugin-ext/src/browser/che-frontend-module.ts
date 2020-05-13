/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import '../../src/browser/style/che-plugins.css';
import '../../src/browser/style/tasks.css';

import { ContainerModule } from 'inversify';
import { MainPluginApiProvider } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { CheApiProvider } from './che-api-provider';
import {
    CHE_API_SERVICE_PATH,
    CHE_TASK_SERVICE_PATH,
    CHE_PRODUCT_SERVICE_PATH,
    CheApiService,
    CheTaskClient,
    CheTaskService,
    CheProductService,
    CheSideCarContentReaderRegistry
} from '../common/che-protocol';
import {
    CHE_PLUGIN_SERVICE_PATH,
    ChePluginService,
    ChePluginServiceClient
} from '../common/che-plugin-protocol';
import { ChePluginServiceClientImpl } from './plugin/che-plugin-service-client';
import { WebSocketConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';
import { CommandContribution, ResourceResolver } from '@theia/core/lib/common';
import { CheTaskClientImpl } from './che-task-client';
import { ChePluginViewContribution } from './plugin/che-plugin-view-contribution';
import { ChePluginView } from './plugin/che-plugin-view';
import { ChePluginFrontentService } from './plugin/che-plugin-frontend-service';
import { ChePluginManager } from './plugin/che-plugin-manager';
import { ChePluginMenu } from './plugin/che-plugin-menu';
import { ChePluginCommandContribution } from './plugin/che-plugin-command-contribution';
import { bindChePluginPreferences } from './plugin/che-plugin-preferences';
import { CheSideCarContentReaderRegistryImpl, CheSideCarResourceResolver } from './che-sidecar-resource';
import { CheMiniBrowserOpenHandler } from './che-mini-browser-open-handler';
import { MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';
import { WebviewEnvironment } from '@theia/plugin-ext/lib/main/browser/webview/webview-environment';
import { CheWebviewEnvironment } from './che-webview-environment';
import { TaskStatusHandler } from './task-status-handler';
import { PluginFrontendViewContribution } from '@theia/plugin-ext/lib/main/browser/plugin-frontend-view-contribution';
import { OauthUtils } from './oauth-utils';
import { TaskService } from '@theia/task/lib/browser';
import { TaskConfigurationsService } from './task-config-service';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(CheApiProvider).toSelf().inSingletonScope();
    bind(MainPluginApiProvider).toService(CheApiProvider);

    bind(CheApiService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CheApiService>(CHE_API_SERVICE_PATH);
    }).inSingletonScope();

    bind(CheTaskClient).to(CheTaskClientImpl).inSingletonScope();
    bind(CheTaskService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        const client: CheTaskClient = ctx.container.get(CheTaskClient);
        return provider.createProxy<CheTaskService>(CHE_TASK_SERVICE_PATH, client);
    }).inSingletonScope();

    bindChePluginPreferences(bind);

    bind(ChePluginServiceClientImpl).toSelf().inSingletonScope();
    bind(ChePluginServiceClient).toService(ChePluginServiceClientImpl);
    bind(ChePluginService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        const client: ChePluginServiceClient = ctx.container.get(ChePluginServiceClient);
        return provider.createProxy<CheApiService>(CHE_PLUGIN_SERVICE_PATH, client);
    }).inSingletonScope();

    rebind(WebviewEnvironment).to(CheWebviewEnvironment).inSingletonScope();

    bind(ChePluginFrontentService).toSelf().inSingletonScope();
    bind(ChePluginManager).toSelf().inSingletonScope();

    rebind(PluginFrontendViewContribution).to(ChePluginViewContribution);

    bind(ChePluginMenu).toSelf().inSingletonScope();

    bind(ChePluginView).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: ChePluginViewContribution.PLUGINS_WIDGET_ID,
        createWidget: () => ctx.container.get(ChePluginView)
    }));

    bind(ChePluginCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(ChePluginCommandContribution);

    bind(CheProductService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CheProductService>(CHE_PRODUCT_SERVICE_PATH);
    }).inSingletonScope();

    bind(CheSideCarContentReaderRegistry).to(CheSideCarContentReaderRegistryImpl).inSingletonScope();
    bind(CheSideCarResourceResolver).toSelf().inSingletonScope();
    bind(ResourceResolver).toService(CheSideCarResourceResolver);

    bind(CheMiniBrowserOpenHandler).toSelf().inSingletonScope();
    rebind(MiniBrowserOpenHandler).to(CheMiniBrowserOpenHandler).inSingletonScope();

    bind(TaskStatusHandler).toSelf().inSingletonScope();
    bind(OauthUtils).toSelf().inSingletonScope();

    bind(TaskConfigurationsService).toSelf().inSingletonScope();
    rebind(TaskService).to(TaskConfigurationsService).inSingletonScope();
});
