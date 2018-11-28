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
import { MainPluginApiProvider } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { CheMainApiProvider } from './che-api-main';
import { CheApiService, CheApiServicePath } from '../common/che-protocol';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {
    bind(CheMainApiProvider).toSelf().inSingletonScope();
    bind(MainPluginApiProvider).toService(CheMainApiProvider);

    bind(CheApiService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<CheApiService>(CheApiServicePath);
    }).inSingletonScope();
});
