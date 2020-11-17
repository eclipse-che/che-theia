/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ContainerModule, interfaces } from 'inversify';

import { CliEndpointCommands } from './cli-endpoint-commands';
import { CommandContribution } from '@theia/core/lib/common';

export default new ContainerModule(
  (bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind) => {
    bind(CommandContribution).to(CliEndpointCommands).inSingletonScope();
  }
);
