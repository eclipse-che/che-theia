/********************************************************************************
 * Copyright (C) 2018-2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ContainerModule } from 'inversify';
import { GitConfigurationListenerContribution } from './git-configuration-contribution';
import { GitConfigurationController } from './git-configuration-controller';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { CheGitNoticationServer, CheGitNoticationPath, CheGitNoticationClient } from '../common/git-notification-proxy';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';

export default new ContainerModule(bind => {
    bind(GitConfigurationController).toSelf().inSingletonScope();
    bind(CheGitNoticationServer).toService(GitConfigurationController);
    bind(GitConfigurationListenerContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(GitConfigurationListenerContribution);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<CheGitNoticationClient>(CheGitNoticationPath, client => {
            const server = ctx.container.get<CheGitNoticationServer>(CheGitNoticationServer);
            server.setClient(client);
            client.onDidCloseConnection(() => server.dispose());
            return server;
        })
    ).inSingletonScope();
});
