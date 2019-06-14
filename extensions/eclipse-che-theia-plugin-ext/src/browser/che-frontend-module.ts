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

import { ContainerModule } from 'inversify';
import { MainPluginApiProvider } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { CheApiProvider } from './che-api-provider';
import {
    CHE_API_SERVICE_PATH,
    CHE_TASK_SERVICE_PATH,
    CHE_PLUGIN_SERVICE_PATH,
    CheApiService,
    CheTaskClient,
    CheTaskService,
    ChePluginService
} from '../common/che-protocol';
import { WebSocketConnectionProvider, bindViewContribution, WidgetFactory } from '@theia/core/lib/browser';
import { CommandContribution } from '@theia/core/lib/common';
import { CheTaskClientImpl } from './che-task-client';
import { ChePluginViewContribution } from './plugin/che-plugin-view-contribution';
import { ChePluginWidget } from './plugin/che-plugin-widget';
import { ChePluginFrontentService } from './plugin/che-plugin-frontend-service';
import { ChePluginManager } from './plugin/che-plugin-manager';
import { ChePluginMenu } from './plugin/che-plugin-menu';
import { ChePluginCommandContribution } from './plugin/che-plugin-command-contribution';
import { bindChePluginPreferences } from './plugin/che-plugin-preferences';

export default new ContainerModule(bind => {
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

    bind(ChePluginService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CheApiService>(CHE_PLUGIN_SERVICE_PATH);
    }).inSingletonScope();

    bind(ChePluginFrontentService).toSelf().inSingletonScope();
    bind(ChePluginManager).toSelf().inSingletonScope();

    bindViewContribution(bind, ChePluginViewContribution);

    bind(ChePluginMenu).toSelf().inSingletonScope();

    bind(ChePluginWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: ChePluginViewContribution.PLUGINS_WIDGET_ID,
        createWidget: () => ctx.container.get(ChePluginWidget)
    }));

    bind(ChePluginCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(ChePluginCommandContribution);
});
