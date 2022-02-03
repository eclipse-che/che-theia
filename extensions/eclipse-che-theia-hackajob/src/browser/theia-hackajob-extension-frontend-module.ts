/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { TheiaHackajobExtensionContribution } from './theia-hackajob-extension-contribution';

export default new ContainerModule(bind => {
  bind(FrontendApplicationContribution).toService(TheiaHackajobExtensionContribution);
  bind(TheiaHackajobExtensionContribution).toSelf().inSingletonScope();
});
