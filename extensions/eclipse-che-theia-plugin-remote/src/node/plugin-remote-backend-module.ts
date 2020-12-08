/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as path from 'path';

import { ContainerModule, interfaces } from 'inversify';
import {
  HostedPluginProcess,
  HostedPluginProcessConfiguration,
} from '@theia/plugin-ext/lib/hosted/node/hosted-plugin-process';
import { MetadataProcessor, ServerPluginRunner } from '@theia/plugin-ext/lib/common';

import { ChePluginUriFactory } from './che-plugin-uri-factory';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { LogHostedPluginProcess } from './hosted-plugin-process-log';
import { PluginReaderExtension } from './plugin-reader-extension';
import { PluginUriFactory } from '@theia/plugin-ext/lib/hosted/node/scanners/plugin-uri-factory';
import { RemoteMetadataProcessor } from './remote-metadata-processor';
import { ServerPluginProxyRunner } from './server-plugin-proxy-runner';

const localModule = ConnectionContainerModule.create(({ bind, unbind, isBound, rebind }) => {
  bind(HostedPluginRemote)
    .toSelf()
    .inSingletonScope()
    .onActivation((ctx: interfaces.Context, hostedPluginRemote: HostedPluginRemote) => {
      const pluginReaderExtension = ctx.container.parent!.get(PluginReaderExtension);
      pluginReaderExtension.setRemotePluginConnection(hostedPluginRemote);
      return hostedPluginRemote;
    });
  bind(ServerPluginRunner).to(ServerPluginProxyRunner).inSingletonScope();
  bind(LogHostedPluginProcess).toSelf().inSingletonScope();
  rebind(HostedPluginProcess).toService(LogHostedPluginProcess);
});

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(HostedPluginMapping).toSelf().inSingletonScope();
  bind(MetadataProcessor).to(RemoteMetadataProcessor).inSingletonScope();
  bind(PluginReaderExtension).toSelf().inSingletonScope();

  rebind(HostedPluginProcessConfiguration).toConstantValue({ path: path.resolve(__dirname, 'plugin-host-custom.js') });
  bind(ConnectionContainerModule).toConstantValue(localModule);
  rebind(PluginUriFactory).to(ChePluginUriFactory).inSingletonScope();
});
