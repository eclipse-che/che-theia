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
import { TaskRunner, Disposable, Task, TaskInfo } from '@eclipse-che/plugin';
import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { TaskConfiguration } from '@theia/task/lib/common';

export class CheTaskImpl implements CheTask {
    private readonly cheTaskMain: CheTaskMain;
    private readonly runnerMap: Map<string, TaskRunner>;
    private readonly taskMap: Map<number, Task>;
    constructor(rpc: RPCProtocol) {
        this.cheTaskMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TASK_MAIN);
        this.runnerMap = new Map();
        this.taskMap = new Map();
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

    async $runTask(id: number, config: TaskConfiguration, ctx?: string): Promise<void> {
        const runner = this.runnerMap.get(config.type);
        if (runner) {
            const task = await runner.run(config, ctx);
            this.taskMap.set(id, task);
        }
    }

    async $killTask(id: number): Promise<void> {
        const task = this.taskMap.get(id);
        if (task) {
            await task.kill();
            this.taskMap.delete(id);
        }
    }

    async $getTaskInfo(id: number): Promise<TaskInfo | undefined> {
        const task = this.taskMap.get(id);
        if (task) {
            return task.getRuntimeInfo();
        }
    }

    async fireTaskExited(taskId: number): Promise<void> {
        let id: number | undefined;
        this.taskMap.forEach((value: Task, key: number) => {
            if (value.getRuntimeInfo().taskId === taskId) {
                id = key;
            }
        });
        if (id) {
            this.taskMap.delete(id);
        }
    }
}
