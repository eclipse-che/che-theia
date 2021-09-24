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
  HostedPluginClient,
  HostedPluginServer,
  hostedServicePath,
} from '@theia/plugin-ext/lib/common/plugin-protocol';
import {
  HostedPluginProcess,
  HostedPluginProcessConfiguration,
} from '@theia/plugin-ext/lib/hosted/node/hosted-plugin-process';

import { CheHostedPluginServerImpl } from './hosted-plugin-service';
import { ChePluginUriFactory } from './che-plugin-uri-factory';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { HostedPluginReader } from '@theia/plugin-ext/lib/hosted/node/plugin-reader';
import { HostedPluginRemote } from './hosted-plugin-remote';
import { LogHostedPluginProcess } from './hosted-plugin-process-log';
import { PluginReaderExtension } from './plugin-reader-extension';
import { PluginUriFactory } from '@theia/plugin-ext/lib/hosted/node/scanners/plugin-uri-factory';
import { ServerPluginProxyRunner } from './server-plugin-proxy-runner';
import { ServerPluginRunner } from '@theia/plugin-ext/lib/common';

const localModule = ConnectionContainerModule.create(({ bind, unbind, isBound, rebind, bindBackendService }) => {
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

  bind(CheHostedPluginServerImpl).toSelf().inSingletonScope();
  rebind(HostedPluginServer).toService(CheHostedPluginServerImpl);
  bindBackendService<HostedPluginServer, HostedPluginClient>(
    hostedServicePath,
    HostedPluginServer,
    (server, client) => {
      server.setClient(client);
      client.onDidCloseConnection(() => server.dispose());
      return server;
    }
  );
});

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(HostedPluginMapping).toSelf().inSingletonScope();
  bind(PluginReaderExtension).toSelf().inSingletonScope();
  rebind(HostedPluginReader).toService(PluginReaderExtension);
  rebind(HostedPluginProcessConfiguration).toConstantValue({ path: path.resolve(__dirname, 'plugin-host-custom.js') });
  bind(ConnectionContainerModule).toConstantValue(localModule);
  rebind(PluginUriFactory).to(ChePluginUriFactory).inSingletonScope();
});
