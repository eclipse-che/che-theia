/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { AboutDialog, AboutDialogProps } from '@theia/core/lib/browser/about-dialog';

import { AboutCheTheiaDialog } from './about-che-theia-dialog';
import { ContainerModule } from 'inversify';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(AboutCheTheiaDialog).toSelf().inSingletonScope();

  // rebind the AboutDialog of theia by our custom one
  rebind(AboutDialog).to(AboutCheTheiaDialog).inSingletonScope();
  rebind(AboutDialogProps).toConstantValue({ title: 'Eclipse Che - Theia' });
});
