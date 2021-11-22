/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CommandContribution } from '@theia/core';
import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { TheiaDashboardClient } from './theia-dashboard-client';

export default new ContainerModule(bind => {
  bind(TheiaDashboardClient).toSelf().inSingletonScope();
  bind(CommandContribution).toService(TheiaDashboardClient);
  bind(FrontendApplicationContribution).toDynamicValue(c => c.container.get(TheiaDashboardClient));
});
