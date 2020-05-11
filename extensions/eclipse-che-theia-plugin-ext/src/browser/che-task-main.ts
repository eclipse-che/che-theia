/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import * as che from '@eclipse-che/plugin';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { TaskSchemaUpdater } from '@theia/task/lib/browser';
import * as theia from '@theia/task/lib/common';
import { injectable, interfaces } from 'inversify';
import { CheTask, CheTaskClient, CheTaskMain, CheTaskService, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { TaskStatusHandler } from './task-status-handler';
import { DisposableCollection, Disposable } from '@theia/core/lib/common/disposable';
import { toTaskInfo, toTaskExitedEvent } from '../common/converter';

@injectable()
export class CheTaskMainImpl implements CheTaskMain, Disposable {
    private readonly delegate: CheTaskService;
    private readonly cheTaskClient: CheTaskClient;
    private readonly taskSchemaUpdater: TaskSchemaUpdater;
    private readonly taskStatusHandler: TaskStatusHandler;
    private readonly toDispose = new DisposableCollection();

    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        const proxy: CheTask = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TASK);
        this.delegate = container.get(CheTaskService);
        this.taskSchemaUpdater = container.get(TaskSchemaUpdater);
        this.cheTaskClient = container.get(CheTaskClient);
        this.cheTaskClient.onKillEvent((taskInfo: che.TaskInfo) => proxy.$killTask(taskInfo));
        this.cheTaskClient.addRunTaskHandler((config, ctx) => proxy.$runTask(config, ctx));
        this.taskStatusHandler = container.get(TaskStatusHandler);

        const taskWatcher = container.get(theia.TaskWatcher);
        this.toDispose.push(taskWatcher.onTaskCreated((event: theia.TaskInfo) => proxy.$onDidStartTask(toTaskInfo(event))));
        this.toDispose.push(taskWatcher.onTaskExit((event: theia.TaskExitedEvent) => proxy.$onDidEndTask(toTaskExitedEvent(event))));
    }

    $registerTaskRunner(type: string): Promise<void> {
        return this.delegate.registerTaskRunner(type);
    }

    $disposeTaskRunner(type: string): Promise<void> {
        return this.delegate.disposeTaskRunner(type);
    }

    $fireTaskExited(event: che.TaskExitedEvent): Promise<void> {
        return this.delegate.fireTaskExited(event);
    }

    async $addTaskSubschema(schema: che.TaskJSONSchema): Promise<void> {
        return this.taskSchemaUpdater.addSubschema(schema);
    }

    async $setTaskStatus(options: che.TaskStatusOptions): Promise<void> {
        return this.taskStatusHandler.setTaskStatus(options);
    }

    dispose(): void {
        this.toDispose.dispose();
    }

}
