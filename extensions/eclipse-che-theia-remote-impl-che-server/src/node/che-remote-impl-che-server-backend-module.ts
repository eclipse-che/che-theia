/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  CertificateService,
  cheCertificateServicePath,
} from '@eclipse-che/theia-remote-api/lib/common/certificate-service';
import { CheK8SService, cheK8SServicePath } from '@eclipse-che/theia-remote-api/lib/common/k8s-service';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';
import { DevfileService, cheDevfileServicePath } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { EndpointService, cheEndpointServicePath } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { FactoryService, cheFactoryServicePath } from '@eclipse-che/theia-remote-api/lib/common/factory-service';
import { OAuthService, cheOAuthServicePath } from '@eclipse-che/theia-remote-api/lib/common/oauth-service';
import { SshKeyService, cheSshKeyServicePath } from '@eclipse-che/theia-remote-api/lib/common/ssh-key-service';
import { TelemetryService, cheTelemetryServicePath } from '@eclipse-che/theia-remote-api/lib/common/telemetry-service';
import { UserService, cheUserServicePath } from '@eclipse-che/theia-remote-api/lib/common/user-service';
import { WorkspaceService, cheWorkspaceServicePath } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

import { CheK8SServiceImpl } from './che-server-k8s-service-impl';
import { CheServerCertificateServiceImpl } from './che-server-certificate-service-impl';
import { CheServerDevfileServiceImpl } from './che-server-devfile-service-impl';
import { CheServerEndpointServiceImpl } from './che-server-endpoint-service-impl';
import { CheServerFactoryServiceImpl } from './che-server-factory-service-impl';
import { CheServerOAuthServiceImpl } from './che-server-oauth-service-impl';
import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';
import { CheServerSshKeyServiceImpl } from './che-server-ssh-key-service-impl';
import { CheServerTelemetryServiceImpl } from './che-server-telemetry-service-impl';
import { CheServerUserServiceImpl } from './che-server-user-service-impl';
import { CheServerWorkspaceServiceImpl } from './che-server-workspace-service-impl';
import { ContainerModule } from 'inversify';

export default new ContainerModule(bind => {
  // do not do the che server binding if not within a dev workspace
  const devWorkspaceName = process.env['DEVWORKSPACE_NAME'];
  const cheServerBinding = process.env['REMOTE_API_USE_CHE_SERVER'];
  if (devWorkspaceName && !cheServerBinding) {
    return;
  }

  bind(CheServerRemoteApiImpl).toSelf().inSingletonScope();

  bind(CheServerCertificateServiceImpl).toSelf().inSingletonScope();
  bind(CheServerFactoryServiceImpl).toSelf().inSingletonScope();
  bind(CheServerOAuthServiceImpl).toSelf().inSingletonScope();
  bind(CheServerSshKeyServiceImpl).toSelf().inSingletonScope();
  bind(CheServerTelemetryServiceImpl).toSelf().inSingletonScope();
  bind(CheServerUserServiceImpl).toSelf().inSingletonScope();
  bind(CheServerWorkspaceServiceImpl).toSelf().inSingletonScope();
  bind(CheServerDevfileServiceImpl).toSelf().inSingletonScope();
  bind(CheServerEndpointServiceImpl).toSelf().inSingletonScope();
  bind(CheK8SServiceImpl).toSelf().inSingletonScope();

  bind(CertificateService).to(CheServerCertificateServiceImpl).inSingletonScope();
  bind(FactoryService).to(CheServerFactoryServiceImpl).inSingletonScope();
  bind(OAuthService).to(CheServerOAuthServiceImpl).inSingletonScope();
  bind(SshKeyService).to(CheServerSshKeyServiceImpl).inSingletonScope();
  bind(TelemetryService).to(CheServerTelemetryServiceImpl).inSingletonScope();
  bind(UserService).to(CheServerUserServiceImpl).inSingletonScope();
  bind(WorkspaceService).to(CheServerWorkspaceServiceImpl).inSingletonScope();
  bind(CheK8SService).to(CheK8SServiceImpl).inSingletonScope();
  bind(DevfileService).to(CheServerDevfileServiceImpl).inSingletonScope();
  bind(EndpointService).to(CheServerEndpointServiceImpl).inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(
      ctx => new JsonRpcConnectionHandler(cheCertificateServicePath, () => ctx.container.get(CertificateService))
    )
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler(cheFactoryServicePath, () => ctx.container.get(FactoryService)))
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler(cheOAuthServicePath, () => ctx.container.get(OAuthService)))
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler(cheSshKeyServicePath, () => ctx.container.get(SshKeyService)))
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(
      ctx => new JsonRpcConnectionHandler(cheTelemetryServicePath, () => ctx.container.get(TelemetryService))
    )
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler(cheUserServicePath, () => ctx.container.get(UserService)))
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(
      ctx => new JsonRpcConnectionHandler(cheWorkspaceServicePath, () => ctx.container.get(WorkspaceService))
    )
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler(cheK8SServicePath, () => ctx.container.get(CheK8SService)))
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(ctx => new JsonRpcConnectionHandler(cheDevfileServicePath, () => ctx.container.get(DevfileService)))
    .inSingletonScope();

  bind(ConnectionHandler)
    .toDynamicValue(
      ctx => new JsonRpcConnectionHandler(cheEndpointServicePath, () => ctx.container.get(EndpointService))
    )
    .inSingletonScope();
});
