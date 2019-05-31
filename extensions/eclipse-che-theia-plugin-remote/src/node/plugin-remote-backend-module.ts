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

const localModule = ConnectionContainerModule.create(({ bind }) => {
    bind(HostedPluginRemote).toSelf().inSingletonScope();
    bind(ServerPluginRunner).to(ServerPluginProxyRunner).inSingletonScope();
});

export default new ContainerModule(bind => {
    try {
        const cheApiNodeProvider = require('@eclipse-che/theia-plugin-ext/lib/plugin/node/che-api-node-provider.js');
        console.log('Che Api node!!! ', cheApiNodeProvider);
        const cheApi = require('@eclipse-che/theia-plugin-ext/lib/node/che-plugin-api-provider.js');
        cheApi.Text2();
    } catch (err) {
        console.log('>>>>Error2', err);
    }

    bind(HostedPluginMapping).toSelf().inSingletonScope();
    bind(MetadataProcessor).to(RemoteMetadataProcessor).inSingletonScope();
    bind(ConnectionContainerModule).toConstantValue(localModule);
}
);
