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

export default new ContainerModule(bind => {
    bind(HostedPluginMapping).toSelf().inSingletonScope();
    bind(HostedPluginRemote).toSelf().inSingletonScope();
    bind(ServerPluginRunner).to(ServerPluginProxyRunner).inSingletonScope();
    bind(MetadataProcessor).to(RemoteMetadataProcessor).inSingletonScope();
}
);
