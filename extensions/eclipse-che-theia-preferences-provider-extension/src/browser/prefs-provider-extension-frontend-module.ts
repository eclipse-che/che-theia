/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PreferencesProvider } from './prefs-provider';

export default new ContainerModule(bind => {
  bind(PreferencesProvider).toSelf().inSingletonScope();
  bind(FrontendApplicationContribution).toDynamicValue(c => c.container.get(PreferencesProvider));
});
