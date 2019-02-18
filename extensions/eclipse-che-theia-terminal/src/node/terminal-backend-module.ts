/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { ContainerModule } from 'inversify';
import { CHEWorkspaceService, cheWorkspaceServicePath } from '../common/workspace-service';
import { CHEWorkspaceServiceImpl } from './workspace-service-impl';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';

export default new ContainerModule(bind => {
    bind(CHEWorkspaceServiceImpl).toSelf().inSingletonScope();

    bind(CHEWorkspaceService).to(CHEWorkspaceServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(cheWorkspaceServicePath, () =>
            ctx.container.get(CHEWorkspaceService)
        )
    );
});
