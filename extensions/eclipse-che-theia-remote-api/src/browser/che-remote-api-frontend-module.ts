/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CertificateService, cheCertificateServicePath } from '../common/certificate-service';
import { CheK8SService, cheK8SServicePath } from '../common/k8s-service';
import { DevfileService, cheDevfileServicePath } from '../common/devfile-service';
import { EndpointService, cheEndpointServicePath } from '../common/endpoint-service';
import { FactoryService, cheFactoryServicePath } from '../common/factory-service';
import { OAuthService, cheOAuthServicePath } from '../common/oauth-service';
import { SshKeyService, cheSshKeyServicePath } from '../common/ssh-key-service';
import { TelemetryService, cheTelemetryServicePath } from '../common/telemetry-service';
import { UserService, cheUserServicePath } from '../common/user-service';
import { WorkspaceService, cheWorkspaceServicePath } from '../common/workspace-service';

import { ContainerModule } from 'inversify';
import { OauthUtils } from './oauth-utils';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {
  bind(CertificateService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<CertificateService>(cheCertificateServicePath);
    })
    .inSingletonScope();

  bind(FactoryService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<FactoryService>(cheFactoryServicePath);
    })
    .inSingletonScope();

  bind(OauthUtils).toSelf().inSingletonScope();
  bind(OAuthService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<OAuthService>(cheOAuthServicePath);
    })
    .inSingletonScope();

  bind(SshKeyService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<SshKeyService>(cheSshKeyServicePath);
    })
    .inSingletonScope();

  bind(TelemetryService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<TelemetryService>(cheTelemetryServicePath);
    })
    .inSingletonScope();

  bind(UserService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<UserService>(cheUserServicePath);
    })
    .inSingletonScope();

  bind(WorkspaceService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<WorkspaceService>(cheWorkspaceServicePath);
    })
    .inSingletonScope();

  bind(CheK8SService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<CheK8SService>(cheK8SServicePath);
    })
    .inSingletonScope();

  bind(DevfileService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<DevfileService>(cheDevfileServicePath);
    })
    .inSingletonScope();

  bind(EndpointService)
    .toDynamicValue(ctx => {
      const provider = ctx.container.get(WebSocketConnectionProvider);
      return provider.createProxy<EndpointService>(cheEndpointServicePath);
    })
    .inSingletonScope();
});
