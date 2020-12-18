/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheMiniBrowserEnvironment } from './che-mini-browser-environment';
import { CheMiniBrowserOpenHandler } from './che-mini-browser-open-handler';
import { ContainerModule } from 'inversify';
import { MiniBrowserEnvironment } from '@theia/mini-browser/lib/browser/environment/mini-browser-environment';
import { MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(CheMiniBrowserOpenHandler).toSelf().inSingletonScope();
  rebind(MiniBrowserOpenHandler).to(CheMiniBrowserOpenHandler).inSingletonScope();

  bind(CheMiniBrowserEnvironment).toSelf().inSingletonScope();
  rebind(MiniBrowserEnvironment).to(CheMiniBrowserEnvironment).inSingletonScope();
});
