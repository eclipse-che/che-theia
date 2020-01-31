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
import { CHE_TASK_SCHEMA } from './schema/che-task-schema';
import { CheTaskProvider } from './task/che-task-provider';
import { CheTaskRunner } from './task/che-task-runner';
import { ServerVariableResolver } from './variable/server-variable-resolver';
import { ProjectPathVariableResolver } from './variable/project-path-variable-resolver';
import { CheTaskEventsHandler } from './preview/task-events-handler';
import { TasksPreviewManager } from './preview/tasks-preview-manager';
import { ExportConfigurationsManager } from './export/export-configs-manager';
import { PreviewUrlVariableResolver } from './variable/preview-url-variable-resolver';
import { TaskStatusHandler } from './task/task-status';

let pluginContext: theia.PluginContext;
let outputChannel: theia.OutputChannel | undefined;

export async function start(context: theia.PluginContext) {
    pluginContext = context;

    const сheTaskEventsHandler = container.get<CheTaskEventsHandler>(CheTaskEventsHandler);
    сheTaskEventsHandler.init();

    const tasksPreviewManager = container.get<TasksPreviewManager>(TasksPreviewManager);
    tasksPreviewManager.init();

    const serverVariableResolver = container.get<ServerVariableResolver>(ServerVariableResolver);
    serverVariableResolver.registerVariables();

    const previewUrlVariableResolver = container.get<PreviewUrlVariableResolver>(PreviewUrlVariableResolver);
    previewUrlVariableResolver.registerVariables();

    const projectPathVariableResolver = container.get<ProjectPathVariableResolver>(ProjectPathVariableResolver);
    projectPathVariableResolver.registerVariables();

    const cheTaskProvider = container.get<CheTaskProvider>(CheTaskProvider);
    const taskProviderSubscription = theia.tasks.registerTaskProvider(CHE_TASK_TYPE, cheTaskProvider);
    getSubscriptions().push(taskProviderSubscription);

    const cheTaskRunner = container.get<CheTaskRunner>(CheTaskRunner);
    const taskRunnerSubscription = await che.task.registerTaskRunner(CHE_TASK_TYPE, cheTaskRunner);
    getSubscriptions().push(taskRunnerSubscription);

    await che.task.addTaskSubschema(CHE_TASK_SCHEMA);

    const exportConfigurationsManager = container.get<ExportConfigurationsManager>(ExportConfigurationsManager);
    exportConfigurationsManager.export();

    const taskStatusHandler = container.get<TaskStatusHandler>(TaskStatusHandler);
    taskStatusHandler.init();
}

export function stop() { }

export function getContext(): theia.PluginContext {
    return pluginContext;
}

// tslint:disable-next-line:no-any
export function getSubscriptions(): { dispose(): any }[] {
    return pluginContext.subscriptions;
}

export function getOutputChannel(): theia.OutputChannel {
    if (outputChannel) {
        return outputChannel;
    }

    outputChannel = theia.window.createOutputChannel('task-plugin-log');
    return outputChannel;
}
