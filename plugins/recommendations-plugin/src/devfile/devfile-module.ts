/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { ContainerModule, interfaces } from 'inversify';

import { DevfileHandler } from './devfile-handler';

const devfileModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(DevfileHandler).toSelf().inSingletonScope();
});

export { devfileModule };
