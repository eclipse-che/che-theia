/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheGitClient, CheGitService, CheGitServicePath } from '../common/git-protocol';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';

import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ContainerModule } from 'inversify';
import { GitConfigurationController } from './git-configuration-controller';
import { GitConfigurationListenerContribution } from './git-configuration-contribution';

export default new ContainerModule(bind => {
  bind(GitConfigurationController).toSelf().inSingletonScope();
  bind(CheGitService).toService(GitConfigurationController);
  bind(GitConfigurationListenerContribution).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(GitConfigurationListenerContribution);
  bind(ConnectionHandler)
    .toDynamicValue(
      ctx =>
        new JsonRpcConnectionHandler<CheGitClient>(CheGitServicePath, client => {
          const server = ctx.container.get<CheGitService>(CheGitService);
          server.setClient(client);
          client.onDidCloseConnection(() => server.dispose());
          return server;
        })
    )
    .inSingletonScope();
});
