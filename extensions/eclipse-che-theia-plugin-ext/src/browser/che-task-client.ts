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
    private readonly onKillEventEmitter: Emitter<number>;
    private taskInfoHandlers: ((id: number) => Promise<TaskInfo>)[] = [];
    private runTaskHandlers: ((id: number, config: TaskConfiguration, ctx?: string) => Promise<void>)[] = [];
    private taskExitedHandlers: ((id: number) => Promise<void>)[] = [];

    constructor() {
        this.onKillEventEmitter = new Emitter<number>();
    }

    async runTask(id: number, taskConfig: TaskConfiguration, ctx?: string): Promise<void> {
        for (const runTaskHandler of this.runTaskHandlers) {
            await runTaskHandler(id, taskConfig, ctx);
        }
        return undefined;
    }

    async getTaskInfo(id: number): Promise<TaskInfo | undefined> {
        for (const taskInfoHandler of this.taskInfoHandlers) {
            try {
                const taskInfo = await taskInfoHandler(id);
                if (taskInfo) {
                    return taskInfo;
                }
            } catch (e) {
                // allow another handlers to handle request
            }
        }
        return undefined;
    }

    async onTaskExited(id: number): Promise<void> {
        for (const taskExitedHandler of this.taskExitedHandlers) {
            try {
                await taskExitedHandler(id);
            } catch (e) {
                // allow another handlers to handle request
            }
        }
    }

    get onKillEvent(): Event<number> {
        return this.onKillEventEmitter.event;
    }

    async killTask(id: number): Promise<void> {
        this.onKillEventEmitter.fire(id);
    }

    addTaskInfoHandler(handler: (id: number) => Promise<TaskInfo>) {
        this.taskInfoHandlers.push(handler);
    }

    addRunTaskHandler(handler: (id: number, config: TaskConfiguration, ctx?: string) => Promise<void>) {
        this.runTaskHandlers.push(handler);
    }

    addTaskExitedHandler(handler: (id: number) => Promise<void>) {
        this.taskExitedHandlers.push(handler);
    }
}
