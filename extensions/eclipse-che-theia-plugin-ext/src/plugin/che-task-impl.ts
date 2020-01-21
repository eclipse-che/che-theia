/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { Disposable, TaskConfiguration, TaskExitedEvent, TaskInfo, TaskJSONSchema, TaskRunner, TaskStatusOptions } from '@eclipse-che/plugin';
import { Emitter } from '@theia/core/lib/common/event';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { CheTask, CheTaskMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

export enum TaskStatus {
    Success = 'SUCCESS',
    Error = 'ERROR',
    Unknown = 'UNKNOWN'
}

export class CheTaskImpl implements CheTask {
    private readonly cheTaskMain: CheTaskMain;
    private readonly runnerMap: Map<string, TaskRunner>;

    private readonly onDidStartTaskEmitter = new Emitter<TaskInfo>();
    readonly onDidStartTask = this.onDidStartTaskEmitter.event;

    private readonly onDidEndTaskEmitter = new Emitter<TaskExitedEvent>();
    readonly onDidEndTask = this.onDidEndTaskEmitter.event;

    constructor(rpc: RPCProtocol) {
        this.cheTaskMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TASK_MAIN);
        this.runnerMap = new Map();
    }
    async registerTaskRunner(type: string, runner: TaskRunner): Promise<Disposable> {
        this.runnerMap.set(type, runner);
        await this.cheTaskMain.$registerTaskRunner(type);
        return {
            dispose: async () => {
                await this.cheTaskMain.$disposeTaskRunner(type);
            }
        };
    }

    async $runTask(config: TaskConfiguration, ctx?: string): Promise<TaskInfo> {
        const runner = this.runnerMap.get(config.type);
        if (runner) {
            return await runner.run(config, ctx);
        }
        throw new Error(`Task Runner for type ${config.type} is not found.`);
    }

    async $killTask(taskInfo: TaskInfo): Promise<void> {
        const runner = this.runnerMap.get(taskInfo.config.type);
        if (runner) {
            return await runner.kill(taskInfo);
        }
        throw new Error(`Failed to terminate Che command: ${taskInfo.config.label}: the corresponging executor is not found`);
    }

    async fireTaskExited(event: TaskExitedEvent): Promise<void> {
        this.cheTaskMain.$fireTaskExited(event);
    }

    async addTaskSubschema(schema: TaskJSONSchema): Promise<void> {
        return this.cheTaskMain.$addTaskSubschema(schema);
    }

    async setTaskStatus(options: TaskStatusOptions): Promise<void> {
        return this.cheTaskMain.$setTaskStatus(options);
    }

    async $onDidStartTask(taskInfo: TaskInfo): Promise<void> {
        this.onDidStartTaskEmitter.fire(taskInfo);
    }

    async $onDidEndTask(event: TaskExitedEvent): Promise<void> {
        this.onDidEndTaskEmitter.fire(event);
    }
}
