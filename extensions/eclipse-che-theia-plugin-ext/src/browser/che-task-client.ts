/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheTaskClient } from '../common/che-protocol';
import { Emitter, Event } from '@theia/core';
import { injectable } from 'inversify';
import { TaskConfiguration, TaskInfo } from '@eclipse-che/plugin';

@injectable()
export class CheTaskClientImpl implements CheTaskClient {
    private readonly onKillEventEmitter: Emitter<TaskInfo>;
    private runTaskHandlers: ((config: TaskConfiguration, ctx?: string) => Promise<TaskInfo>)[] = [];

    constructor() {
        this.onKillEventEmitter = new Emitter<TaskInfo>();
    }

    async runTask(taskConfig: TaskConfiguration, ctx?: string): Promise<TaskInfo> {
        for (const runTaskHandler of this.runTaskHandlers) {
            const taskInfo = await runTaskHandler(taskConfig, ctx);
            if (taskInfo) {
                return taskInfo;
            }
        }
        throw new Error(`Failed to process configuration with label ${taskConfig.label} by Che Task Handler`);
    }

    get onKillEvent(): Event<TaskInfo> {
        return this.onKillEventEmitter.event;
    }

    async killTask(taskInfo: TaskInfo): Promise<void> {
        this.onKillEventEmitter.fire(taskInfo);
    }

    addRunTaskHandler(handler: (config: TaskConfiguration, ctx?: string) => Promise<TaskInfo>): void {
        this.runTaskHandlers.push(handler);
    }
}
