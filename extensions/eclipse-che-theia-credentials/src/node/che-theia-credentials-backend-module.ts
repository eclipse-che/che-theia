/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CREDENTIALS_SERVICE_PATH, CredentialsServer } from '../common/credentials-protocol';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';

import { CheCredentialsServer } from './che-credentials-server';
import { ContainerModule } from 'inversify';

export default new ContainerModule(bind => {
  bind(CredentialsServer).to(CheCredentialsServer).inSingletonScope();
  bind(ConnectionHandler)
    .toDynamicValue(
      context => new JsonRpcConnectionHandler(CREDENTIALS_SERVICE_PATH, () => context.container.get(CredentialsServer))
    )
    .inSingletonScope();
});
