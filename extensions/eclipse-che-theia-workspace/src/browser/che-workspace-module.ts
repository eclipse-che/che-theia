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
import { QuickOpenCheWorkspace } from './che-quick-open-workspace';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { CheWorkspaceContribution } from './che-workspace-contribution';
import { CheWorkspaceController } from './che-workspace-controller';
import { ExplorerContribution } from './explorer-contribution';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(QuickOpenCheWorkspace).toSelf().inSingletonScope();
    bind(CheWorkspaceController).toSelf().inSingletonScope();
    bind(CheWorkspaceContribution).toSelf().inSingletonScope();
    for (const identifier of [CommandContribution, MenuContribution]) {
        bind(identifier).toService(CheWorkspaceContribution);
    }

    bind(ExplorerContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).to(ExplorerContribution);
});
