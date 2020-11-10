/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CliEndpoint, cliPath } from '../common';

import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { ContainerModule } from 'inversify';
import { DefaultCliEndpoint } from './default-cli-endpoint';

const cliServiceModule = ConnectionContainerModule.create(({ bindBackendService }) => {
  bindBackendService(cliPath, CliEndpoint);
});

export default new ContainerModule(bind => {
  bind(DefaultCliEndpoint).toSelf().inSingletonScope();
  bind(CliEndpoint).toService(DefaultCliEndpoint);
  bind(ConnectionContainerModule).toConstantValue(cliServiceModule);
});
