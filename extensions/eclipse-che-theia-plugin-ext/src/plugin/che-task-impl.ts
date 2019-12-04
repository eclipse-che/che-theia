/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheTask, CheTaskMain, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { TaskRunner, Disposable, TaskInfo, TaskExitedEvent, TaskConfiguration, TaskJSONSchema } from '@eclipse-che/plugin';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class CheTaskImpl implements CheTask {
    private readonly cheTaskMain: CheTaskMain;
    private readonly runnerMap: Map<string, TaskRunner>;
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
}
