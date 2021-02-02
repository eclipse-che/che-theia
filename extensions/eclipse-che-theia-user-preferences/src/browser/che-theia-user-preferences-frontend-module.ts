/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { FrontendApplicationContribution, ShellLayoutRestorer, StorageService } from '@theia/core/lib/browser';

import { CheFrontendApplication } from './che-frontend-application';
import { CheShellLayoutRestorer } from './che-shell-layout-restorer';
import { CheStorageService } from './che-storage-service';
import { ContainerModule } from 'inversify';
import { TheiaThemePreferenceSynchronizer } from './theme/theme-synchronizer';
import { bindStorageServicePreferences } from './che-storage-preferences';
import { bindTheiaThemePreferences } from './theme/theme-preferences';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bindTheiaThemePreferences(bind);
  bindStorageServicePreferences(bind);
  bind(FrontendApplicationContribution).to(TheiaThemePreferenceSynchronizer).inSingletonScope();
  bind(FrontendApplicationContribution).to(CheFrontendApplication).inSingletonScope();

  bind(CheStorageService).toSelf().inSingletonScope();
  rebind(StorageService).toService(CheStorageService);

  bind(CheShellLayoutRestorer).toSelf().inSingletonScope();
  rebind(ShellLayoutRestorer).to(CheShellLayoutRestorer);
});
