/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ContainerModule, interfaces } from 'inversify';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { ServerPluginProxyRunner } from './server-plugin-proxy-runner';
import { MetadataProcessor, ServerPluginRunner } from '@theia/plugin-ext/lib/common';
import { RemoteMetadataProcessor } from './remote-metadata-processor';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { PluginReaderExtension } from './plugin-reader-extension';

const localModule = ConnectionContainerModule.create(({ bind }) => {
    bind(HostedPluginRemote).toSelf().inSingletonScope().onActivation((ctx: interfaces.Context, hostedPluginRemote: HostedPluginRemote) => {
        const pluginReaderExtension = ctx.container.parent.get(PluginReaderExtension);
        pluginReaderExtension.setRemotePluginConnection(hostedPluginRemote);
        return hostedPluginRemote;
    });
    bind(ServerPluginRunner).to(ServerPluginProxyRunner).inSingletonScope();
});

export default new ContainerModule(bind => {
    bind(HostedPluginMapping).toSelf().inSingletonScope();
    bind(MetadataProcessor).to(RemoteMetadataProcessor).inSingletonScope();
    bind(PluginReaderExtension).toSelf().inSingletonScope();

    bind(ConnectionContainerModule).toConstantValue(localModule);
});
