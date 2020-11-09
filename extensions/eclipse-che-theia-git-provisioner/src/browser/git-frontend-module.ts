/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution, WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { bindGitPreferences } from './git-preferences';
import { CheTheiaStatusBarFrontendContribution } from './status-bar-contribution';
import { CheGitService, CheGitServicePath, CheGitClient } from '../common/git-protocol';
import { CheGitClientImpl } from './git-config-changes-tracker';

export default new ContainerModule(bind => {
    bindGitPreferences(bind);
    bind(FrontendApplicationContribution).to(CheTheiaStatusBarFrontendContribution).inSingletonScope();
    bind(CheGitClientImpl).toSelf().inSingletonScope();
    bind(CheGitClient).toService(CheGitClientImpl);
    bind(CheGitService).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        const client = ctx.container.get<CheGitClient>(CheGitClient);
        return provider.createProxy<CheGitService>(CheGitServicePath, client);
    }).inSingletonScope();
});
