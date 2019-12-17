/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { ContainerModule } from 'inversify';
import { TestServerPluginApiProvider } from '../testservice-plugin-api-provider';
import { ExtPluginApiProvider } from '@theia/plugin-ext';

export default new ContainerModule(bind => {
    bind(TestServerPluginApiProvider).toSelf().inSingletonScope();
    bind(Symbol.for(ExtPluginApiProvider)).toService(TestServerPluginApiProvider);
});
