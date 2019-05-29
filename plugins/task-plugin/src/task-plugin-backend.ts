/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import 'reflect-metadata';
import { container } from './che-task-backend-module';
import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { CHE_TASK_TYPE } from './task/task-protocol';
import { CheTaskProvider } from './task/che-task-provider';
import { CheTaskRunner } from './task/che-task-runner';
import { ServerVariableResolver } from './variable/server-variable-resolver';
import { ProjectPathVariableResolver } from './variable/project-path-variable-resolver';
import { CheTaskEventsHandler } from './preview/task-events-handler';
import { TasksPreviewManager } from './preview/tasks-preview-manager';
import { ExportConfigurationsManager } from './export/export-configs-manager';

let pluginContext: theia.PluginContext;

export async function start(context: theia.PluginContext) {
    pluginContext = context;

    const сheTaskEventsHandler = container.get<CheTaskEventsHandler>(CheTaskEventsHandler);
    сheTaskEventsHandler.init();

    const tasksPreviewManager = container.get<TasksPreviewManager>(TasksPreviewManager);
    tasksPreviewManager.init();

    const serverVariableResolver = container.get<ServerVariableResolver>(ServerVariableResolver);
    serverVariableResolver.registerVariables();

    const projectPathVariableResolver = container.get<ProjectPathVariableResolver>(ProjectPathVariableResolver);
    projectPathVariableResolver.registerVariables();

    const cheTaskProvider = container.get<CheTaskProvider>(CheTaskProvider);
    const taskProviderSubscription = theia.tasks.registerTaskProvider(CHE_TASK_TYPE, cheTaskProvider);
    getSubscriptions().push(taskProviderSubscription);

    const cheTaskRunner = container.get<CheTaskRunner>(CheTaskRunner);
    const taskRunnerSubscription = await che.task.registerTaskRunner(CHE_TASK_TYPE, cheTaskRunner);
    getSubscriptions().push(taskRunnerSubscription);

    const exportConfigurationsManager = container.get<ExportConfigurationsManager>(ExportConfigurationsManager);
    exportConfigurationsManager.export();
}

export function stop() { }

export function getContext(): theia.PluginContext {
    return pluginContext;
}

// tslint:disable-next-line:no-any
export function getSubscriptions(): { dispose(): any }[] {
    return pluginContext.subscriptions;
}
