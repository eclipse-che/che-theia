/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CheTask, CheTaskMain, CheTaskService, CheTaskClient, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { interfaces, injectable } from 'inversify';
import { TaskExitedEvent } from '@eclipse-che/plugin';

@injectable()
export class CheTaskMainImpl implements CheTaskMain {
    private readonly delegate: CheTaskService;
    private readonly cheTaskClient: CheTaskClient;
    constructor(container: interfaces.Container, rpc: RPCProtocol) {
        const proxy: CheTask = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_TASK);
        this.delegate = container.get(CheTaskService);
        this.cheTaskClient = container.get(CheTaskClient);
        this.cheTaskClient.onKillEvent(id => proxy.$killTask(id));
        this.cheTaskClient.addTaskInfoHandler(id => proxy.$getTaskInfo(id));
        this.cheTaskClient.addTaskExitedHandler(id => proxy.$onTaskExited(id));
        this.cheTaskClient.addRunTaskHandler((id, config, ctx) => proxy.$runTask(id, config, ctx));
    }
    $registerTaskRunner(type: string): Promise<void> {
        return this.delegate.registerTaskRunner(type);
    }

    $disposeTaskRunner(type: string): Promise<void> {
        return this.delegate.disposeTaskRunner(type);
    }

    $fireTaskExited(event: TaskExitedEvent): Promise<void> {
        return this.delegate.fireTaskExited(event);
    }
}
