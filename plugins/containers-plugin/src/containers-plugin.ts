/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as cheTheia from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import {
  CONTAINERS_PLUGIN_RUN_TASK_COMMAND_ID,
  ContainersTreeDataProvider,
  containersTreeTaskLauncherCommandHandler,
} from './containers-tree-data-provider';

import { ContainersService } from './containers-service';

export async function start(context: theia.PluginContext): Promise<void> {
  const treeDataProvider = new ContainersTreeDataProvider();
  const treeDataDisposableFn = theia.Disposable.create(() => {
    treeDataProvider.dispose();
  });
  context.subscriptions.push(treeDataDisposableFn);

  const view = theia.window.createTreeView('workspace-view', { treeDataProvider });
  const workspace = await cheTheia.workspace.getCurrentWorkspace();
  if (workspace.devfile && workspace.devfile.metadata && workspace.devfile.metadata.name) {
    view.title = workspace.devfile.metadata.name;
  }

  const containersService = new ContainersService();
  containersService.updateContainers().then(
    () => {
      treeDataProvider.updateContainersTreeData(containersService.containers);
    },
    error => {
      console.error(error);
      theia.window.showErrorMessage(error);
    }
  );

  const containersTreeTaskLauncherCommand = { id: CONTAINERS_PLUGIN_RUN_TASK_COMMAND_ID };
  context.subscriptions.push(
    theia.commands.registerCommand(containersTreeTaskLauncherCommand, containersTreeTaskLauncherCommandHandler)
  );
}

export function stop(): void {}
