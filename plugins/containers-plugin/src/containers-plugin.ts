/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { ContainersService } from './containers-service';
import {
    ContainersTreeDataProvider,
    CONTAINERS_PLUGIN_RUN_TASK_COMMAND_ID,
    containersTreeTaskLauncherCommandHandler
} from './containers-tree-data-provider';

export function start(context: theia.PluginContext): void {
    const treeDataProvider = new ContainersTreeDataProvider();
    const treeDataDisposableFn = theia.Disposable.create(() => {
        treeDataProvider.dispose();
    });
    context.subscriptions.push(treeDataDisposableFn);

    theia.window.createTreeView('workspace', { treeDataProvider });

    const containersService = new ContainersService();
    containersService.updateContainers().then(() => {
        treeDataProvider.updateContainersTreeData(containersService.containers);
    }, error => {
        console.error(error);
        theia.window.showErrorMessage(error);
    });

    const containersTreeTaskLauncherCommand = { id: CONTAINERS_PLUGIN_RUN_TASK_COMMAND_ID };
    context.subscriptions.push(
        theia.commands.registerCommand(containersTreeTaskLauncherCommand, containersTreeTaskLauncherCommandHandler)
    );
}

export function stop(): void {
}
