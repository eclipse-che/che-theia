/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ContainerModule } from 'inversify';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { ServerPluginProxyRunner } from './server-plugin-proxy-runner';
import { MetadataProcessor, ServerPluginRunner } from '@theia/plugin-ext/lib/common';
import { RemoteMetadataProcessor } from './remote-metadata-processor';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { RemotePluginServiceImpl } from './remote-plugin-service';
import { RemotePluginStarterService, remotePluginServicePath } from '../common/remote-plugin-protocol';
import { ConnectionHandler } from '@theia/core/lib/common/messaging/handler';
import { JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging/proxy-factory';

const localModule = ConnectionContainerModule.create(({ bind }) => {
    bind(HostedPluginRemote).toSelf().inSingletonScope();
    bind(ServerPluginRunner).to(ServerPluginProxyRunner).inSingletonScope();
    bind(RemotePluginStarterService).to(RemotePluginServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(remotePluginServicePath, () =>
            ctx.container.get(RemotePluginStarterService)
        )
    ).inSingletonScope();
});

export default new ContainerModule(bind => {
    bind(HostedPluginMapping).toSelf().inSingletonScope();
    bind(MetadataProcessor).to(RemoteMetadataProcessor).inSingletonScope();
    bind(ConnectionContainerModule).toConstantValue(localModule);
}
);
