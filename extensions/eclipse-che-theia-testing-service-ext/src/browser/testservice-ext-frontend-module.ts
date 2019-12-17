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
import { PluginHandleRegistry } from './plugin-handle-registry';
import { TestApiProvider } from './test-api-provider';
import { MainPluginApiProvider, LanguagesMainFactory } from '@theia/plugin-ext';
import { LanguagesMainTestImpl } from './languages-test-main';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(TestApiProvider).toSelf().inSingletonScope();
    bind(MainPluginApiProvider).toService(TestApiProvider);

    bind(PluginHandleRegistry).toSelf().inSingletonScope();
    bind(LanguagesMainTestImpl).toSelf().inTransientScope();
    rebind(LanguagesMainFactory).toFactory(context => (rpc: RPCProtocol) => {
        const child = context.container.createChild();
        child.bind(RPCProtocol).toConstantValue(rpc);
        return child.get(LanguagesMainTestImpl);
    });
});
