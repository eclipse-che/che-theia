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

import { FeaturedPluginStrategy } from './featured-plugin-strategy';
import { RecommendPluginOpenFileStrategy } from './recommend-plugin-open-file-strategy';

const featuredModule = new ContainerModule((bind: interfaces.Bind) => {
  bind(FeaturedPluginStrategy).toSelf().inSingletonScope();
  bind(RecommendPluginOpenFileStrategy).toSelf().inSingletonScope();
});

export { featuredModule };
