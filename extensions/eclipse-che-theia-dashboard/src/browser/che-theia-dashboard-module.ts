/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TheiaDashboardClient } from './theia-dashboard-client';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';

import { ContainerModule } from 'inversify';

export default new ContainerModule(bind => {
    bind(TheiaDashboardClient).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toDynamicValue(c => c.container.get(TheiaDashboardClient));
});
