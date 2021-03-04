/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
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

import { ContainerModule } from 'inversify';
import { K8SServiceImpl } from './k8s-service-impl';
import { K8sCertificateServiceImpl } from './k8s-certificate-service-impl';
import { K8sDevWorkspaceEnvVariables } from './k8s-devworkspace-env-variables';
import { K8sDevfileServiceImpl } from './k8s-devfile-service-impl';
import { K8sEndpointServiceImpl } from './k8s-endpoint-service-impl';
import { K8sFactoryServiceImpl } from './k8s-factory-service-impl';
import { K8sOAuthServiceImpl } from './k8s-oauth-service-impl';
import { K8sSshKeyServiceImpl } from './k8s-ssh-key-service-impl';
import { K8sTelemetryServiceImpl } from './k8s-telemetry-service-impl';
import { K8sUserServiceImpl } from './k8s-user-service-impl';
import { K8sWorkspaceServiceImpl } from './k8s-workspace-service-impl';

export default new ContainerModule(bind => {
  // skip K8s binding if we're in che-server mode
  const devWorkspaceName = process.env['DEVWORKSPACE_NAME'];
  if (!devWorkspaceName) {
    return;
  }

  bind(K8sCertificateServiceImpl).toSelf().inSingletonScope();
  bind(K8sFactoryServiceImpl).toSelf().inSingletonScope();
  bind(K8sOAuthServiceImpl).toSelf().inSingletonScope();
  bind(K8sSshKeyServiceImpl).toSelf().inSingletonScope();
  bind(K8sTelemetryServiceImpl).toSelf().inSingletonScope();
  bind(K8sUserServiceImpl).toSelf().inSingletonScope();
  bind(K8sWorkspaceServiceImpl).toSelf().inSingletonScope();
  bind(K8SServiceImpl).toSelf().inSingletonScope();
  bind(K8sDevfileServiceImpl).toSelf().inSingletonScope();
  bind(K8sEndpointServiceImpl).toSelf().inSingletonScope();
  bind(K8sDevWorkspaceEnvVariables).toSelf().inSingletonScope();

  bind(CertificateService).to(K8sCertificateServiceImpl).inSingletonScope();
  bind(FactoryService).to(K8sFactoryServiceImpl).inSingletonScope();
  bind(OAuthService).to(K8sOAuthServiceImpl).inSingletonScope();
  bind(SshKeyService).to(K8sSshKeyServiceImpl).inSingletonScope();
  bind(TelemetryService).to(K8sTelemetryServiceImpl).inSingletonScope();
  bind(UserService).to(K8sUserServiceImpl).inSingletonScope();
  bind(WorkspaceService).to(K8sWorkspaceServiceImpl).inSingletonScope();
  bind(CheK8SService).to(K8SServiceImpl).inSingletonScope();
  bind(DevfileService).to(K8sDevfileServiceImpl).inSingletonScope();
  bind(EndpointService).to(K8sEndpointServiceImpl).inSingletonScope();

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
