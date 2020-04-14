/*********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as path from 'path';
import { ContainerModule, interfaces } from 'inversify';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { ServerPluginProxyRunner } from './server-plugin-proxy-runner';
import { MetadataProcessor, ServerPluginRunner } from '@theia/plugin-ext/lib/common';
import { RemoteMetadataProcessor } from './remote-metadata-processor';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { PluginReaderExtension } from './plugin-reader-extension';
import { HostedPluginProcess, HostedPluginProcessConfiguration } from '@theia/plugin-ext/lib/hosted/node/hosted-plugin-process';
import { LogHostedPluginProcess } from './hosted-plugin-process-log';

const localModule = ConnectionContainerModule.create(({ bind, unbind, isBound, rebind }) => {
    bind(HostedPluginRemote).toSelf().inSingletonScope().onActivation((ctx: interfaces.Context, hostedPluginRemote: HostedPluginRemote) => {
        const pluginReaderExtension = ctx.container.parent!.get(PluginReaderExtension);
        pluginReaderExtension.setRemotePluginConnection(hostedPluginRemote);
        return hostedPluginRemote;
    });
    bind(ServerPluginRunner).to(ServerPluginProxyRunner).inSingletonScope();
    bind(LogHostedPluginProcess).toSelf().inSingletonScope();
    rebind(HostedPluginProcess).toService(LogHostedPluginProcess);
});

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    try {
        // Force to include theia-plugin-ext inside node_modules
        require('@eclipse-che/theia-plugin-ext/lib/node/che-plugin-api-provider.js');
    } catch (err) {
        console.log('Unable to set up che theia plugin api: ', err);
    }
    bind(HostedPluginMapping).toSelf().inSingletonScope();
    bind(MetadataProcessor).to(RemoteMetadataProcessor).inSingletonScope();
    bind(PluginReaderExtension).toSelf().inSingletonScope();

    rebind(HostedPluginProcessConfiguration).toConstantValue({ path: path.resolve(__dirname, 'plugin-host-custom.js') });
    bind(ConnectionContainerModule).toConstantValue(localModule);
});
