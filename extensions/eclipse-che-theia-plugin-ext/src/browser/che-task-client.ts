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
    private taskInfoHandler: ((id: number) => Promise<TaskInfo>) | undefined;
    private runTaskHandler: ((id: number, config: TaskConfiguration, ctx?: string) => Promise<void>) | undefined;
    constructor() {
        this.onKillEventEmitter = new Emitter<number>();
    }

    async runTask(id: number, taskConfig: TaskConfiguration, ctx?: string): Promise<void> {
        if (this.runTaskHandler) {
            return await this.runTaskHandler(id, taskConfig, ctx);
        }
    }

    async getTaskInfo(id: number): Promise<TaskInfo | undefined> {
        if (this.taskInfoHandler) {
            return await this.taskInfoHandler(id);
        }
    }

    get onKillEvent(): Event<number> {
        return this.onKillEventEmitter.event;
    }

    async killTask(id: number): Promise<void> {
        this.onKillEventEmitter.fire(id);
    }

    setTaskInfoHandler(handler: (id: number) => Promise<TaskInfo>) {
        this.taskInfoHandler = handler;
    }

    setRunTaskHandler(handler: (id: number, config: TaskConfiguration, ctx?: string) => Promise<void>) {
        this.runTaskHandler = handler;
    }
}
