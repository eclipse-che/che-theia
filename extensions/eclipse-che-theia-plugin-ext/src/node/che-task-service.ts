/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheTaskClient, CheTaskService } from '../common/che-protocol';
import { injectable, interfaces } from 'inversify';
import { Task, TaskManager, TaskOptions, TaskRunnerRegistry } from '@theia/task/lib/node';
import { Disposable, ILogger } from '@theia/core';
import { TaskConfiguration, TaskInfo } from '@theia/task/lib/common/task-protocol';
import { TaskExitedEvent } from '@eclipse-che/plugin';

@injectable()
export class CheTaskServiceImpl implements CheTaskService {
    private readonly runnerRegistry: TaskRunnerRegistry;
    private readonly taskManager: TaskManager;
    private readonly logger: ILogger;
    private readonly disposableMap: Map<string, Disposable>;
    private readonly cheTasks: CheTask[] = [];
    private readonly clients: CheTaskClient[];
    constructor(container: interfaces.Container) {
        this.runnerRegistry = container.get(TaskRunnerRegistry);
        this.taskManager = container.get(TaskManager);
        this.logger = container.get(ILogger);
        this.disposableMap = new Map();
        this.clients = [];
    }

    async registerTaskRunner(type: string): Promise<void> {
        const runner = {
            run(taskConfig: TaskConfiguration, ctx?: string): Promise<Task> {
                return runTask(taskConfig, ctx);
            }
        };
        this.disposableMap.set(type, this.runnerRegistry.registerRunner(type, runner));
        const runTask = async (config: TaskConfiguration, ctx?: string): Promise<Task> => {
            for (const client of this.clients) {
                const taskInfo = await client.runTask(config, ctx);
                const options: CheTaskOptions = { label: config.label, config, context: ctx, runtimeInfo: taskInfo };

                const cheTask = new CheTask(this.taskManager, this.logger, this.clients, options);
                this.cheTasks.push(cheTask);
                return cheTask;
            }
            throw new Error(`Failed to process configuration with label ${config.label} by Che Task Client`);
        };
    }

    dispose() {
        // do nothing
    }

    setClient(client: CheTaskClient) {
        this.clients.push(client);
    }

    async disposeTaskRunner(type: string): Promise<void> {
        const disposable = this.disposableMap.get(type);
        if (disposable) {
            disposable.dispose();
        }
    }

    async disconnectClient(client: CheTaskClient) {
        const idx = this.clients.indexOf(client);
        if (idx > -1) {
            this.clients.splice(idx, 1);
        }
    }

    async fireTaskExited(event: TaskExitedEvent): Promise<void> {
        for (const task of this.cheTasks) {
            const runtimeInfo = task.getRuntimeInfo();
            if (runtimeInfo.execId === event.execId || runtimeInfo.taskId === event.taskId) {

                task.fireTaskExited({ taskId: task.id, code: event.code, ctx: runtimeInfo.ctx, processId: event.processId });

                const index = this.cheTasks.indexOf(task);
                if (index > -1) {
                    this.cheTasks.splice(index, 1);
                }
                break;
            }
        }
    }
}

export interface CheTaskOptions extends TaskOptions {
    runtimeInfo: TaskInfo;
}

class CheTask extends Task {
    private readonly clients: CheTaskClient[];
    private taskInfo: TaskInfo;
    constructor(
        taskManager: TaskManager,
        logger: ILogger,
        clients: CheTaskClient[],
        options: CheTaskOptions) {

        super(taskManager, logger, options);
        this.clients = clients;
        this.taskInfo = this.toTaskInfo(options.runtimeInfo);
    }

    getRuntimeInfo(): TaskInfo {
        return this.taskInfo;
    }

    async kill(): Promise<void> {
        this.clients.forEach(client => client.killTask(this.taskInfo));
    }

    fireTaskExited(event: TaskExitedEvent): void {
        super.fireTaskExited({ taskId: event.taskId!, code: event.code, ctx: event.ctx, config: this.options.config, processId: event.processId });
    }

    private toTaskInfo(runtimeInfo: TaskInfo): TaskInfo {
        const { taskId, terminalId, ctx, config, ...properties } = runtimeInfo;
        const result: TaskInfo = {
            taskId: this.taskId,
            terminalId,
            ctx,
            config,
            ...properties
        };

        return result;
    }
}
