/**********************************************************************
 * Copyright (c) 2018-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  CHE_GITHUB_SERVICE_PATH,
  CHE_PRODUCT_SERVICE_PATH,
  CHE_TASK_SERVICE_PATH,
  CheGitHubService,
  CheProductService,
  CheTaskClient,
  CheTaskService,
} from '../common/che-protocol';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';

import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { CheClientIpServiceContribution } from './che-client-ip-service';
import { CheEnvVariablesServerImpl } from './che-env-variables-server';
import { CheGithubServiceImpl } from './che-github-service';
import { ChePluginApiContribution } from './che-plugin-script-service';
import { ChePluginApiProvider } from './che-plugin-api-provider';
import { CheProductServiceImpl } from './che-product-service';
import { CheTaskServiceImpl } from './che-task-service';
import { ContainerModule } from 'inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { ExtPluginApiProvider } from '@theia/plugin-ext';
import { PluginApiContribution as WsRequestValidatorContributionImpl } from '@theia/plugin-ext/lib/main/node/plugin-service';
import { WsRequestValidatorContributionIntercepted } from './ws-request-validator-contribution';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(CheEnvVariablesServerImpl).toSelf().inSingletonScope();
  rebind(EnvVariablesServer).toService(CheEnvVariablesServerImpl);

  bind(ChePluginApiProvider).toSelf().inSingletonScope();
  bind(Symbol.for(ExtPluginApiProvider)).toService(ChePluginApiProvider);

  bind(ChePluginApiContribution).toSelf().inSingletonScope();
  bind(CheClientIpServiceContribution).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(ChePluginApiContribution);
  bind(BackendApplicationContribution).toService(CheClientIpServiceContribution);

  rebind(WsRequestValidatorContributionImpl).to(WsRequestValidatorContributionIntercepted).inSingletonScope();

  bind(CheTaskService)
    .toDynamicValue(ctx => new CheTaskServiceImpl(ctx.container))
    .inSingletonScope();
  bind(ConnectionHandler)
    .toDynamicValue(
      ctx =>
        new JsonRpcConnectionHandler<CheTaskClient>(CHE_TASK_SERVICE_PATH, client => {
          const server: CheTaskService = ctx.container.get(CheTaskService);
          server.setClient(client);
          client.onDidCloseConnection(() => server.disconnectClient(client));
          return server;
        })
    )
    .inSingletonScope();

  bind(CheProductService).to(CheProductServiceImpl).inSingletonScope();
  bind(ConnectionHandler)
    .toDynamicValue(
      ctx => new JsonRpcConnectionHandler(CHE_PRODUCT_SERVICE_PATH, () => ctx.container.get(CheProductService))
    )
    .inSingletonScope();

  bind(CheGitHubService).to(CheGithubServiceImpl).inSingletonScope();
  bind(ConnectionHandler)
    .toDynamicValue(
      ctx => new JsonRpcConnectionHandler(CHE_GITHUB_SERVICE_PATH, () => ctx.container.get(CheGitHubService))
    )
    .inSingletonScope();
});
