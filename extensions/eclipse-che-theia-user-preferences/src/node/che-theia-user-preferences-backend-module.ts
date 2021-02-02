/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { CheTheiaPreferencesContribution } from './che-theia-preferences-contribution';
import { CheTheiaUserPreferencesSynchronizer } from './che-theia-preferences-synchronizer';
import { ContainerModule } from 'inversify';

export default new ContainerModule(bind => {
  bind(CheTheiaUserPreferencesSynchronizer).toSelf().inSingletonScope();

  bind(CheTheiaPreferencesContribution).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(CheTheiaPreferencesContribution);
});
