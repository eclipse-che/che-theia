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
import { CommandContribution } from '@theia/core/lib/common/command';
import { RemotePluginCommandContribution } from './remote-plugin-command';
import { RemotePluginInitializerService, remotePluginServicePath } from '../common/remote-plugin-protocol';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {

    bind(RemotePluginCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(RemotePluginCommandContribution);

    bind(RemotePluginInitializerService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy(remotePluginServicePath);
    }).inSingletonScope();
});
