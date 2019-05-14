/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject, postConstruct } from 'inversify';
import * as che from '@eclipse-che/plugin';
import { CHE_TASK_TYPE } from './task-protocol';
import { MachineExecClient, MachineExec } from '../machine/machine-exec-client';
import { TerminalWidgetFactory } from '../machine/terminal-widget';
import { ProjectPathVariableResolver } from '../variable/project-path-variable-resolver';
import { CheWorkspaceClient } from '../che-workspace-client';
import { MachineExecWatcher } from '../machine/machine-exec-watcher';
import * as startPoint from '../task-plugin-backend';

// CHE task gets ID at creating in che task service
// https://github.com/eclipse/che-theia/blob/c515f75044f9099820c3b18afb8de83f263d671a/extensions/eclipse-che-theia-plugin-ext/src/node/che-task-service.ts#L89
const STUB_TASK_ID: number = -1;

@injectable()
export class CheTaskRunner {

    @inject(MachineExecClient)
    protected readonly machineExecClient!: MachineExecClient;

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    @inject(TerminalWidgetFactory)
    protected readonly terminalWidgetFactory!: TerminalWidgetFactory;

    @inject(ProjectPathVariableResolver)
    protected readonly projectPathVariableResolver!: ProjectPathVariableResolver;

    @inject(MachineExecWatcher)
    protected readonly machineExecWatcher: MachineExecWatcher;

    @postConstruct()
    protected init() {
        const disposable = this.machineExecWatcher.onExit(event => {
            che.task.fireTaskExited({ execId: event.id, code: event.code });
        });
        startPoint.getSubscriptions().push(disposable);
    }

    /**
     * Runs a task from the given task configuration which must have a target property specified.
     */
    async run(taskConfig: che.TaskConfiguration, ctx?: string): Promise<che.Task> {
        const { type, label, ...definition } = taskConfig;
        if (type !== CHE_TASK_TYPE) {
            throw new Error(`Unsupported task type: ${type}`);
        }

        const target = definition.target;
        if (!target) {
            throw new Error("Che task config must have 'target' property specified");
        }

        const workspaceId = target.workspaceId;
        if (!workspaceId) {
            throw new Error("Che task config must have 'target.workspaceId' property specified");
        }

        const machineName = target.machineName;
        if (!machineName) {
            throw new Error("Che task config must have 'target.machineName' property specified");
        }

        const machineExec: MachineExec = {
            identifier: {
                machineName: machineName,
                workspaceId: workspaceId
            },
            cmd: ['sh', '-c', "'" + taskConfig.command + "'"],
            tty: false,
            cwd: target.workingDir
        };

        try {
            const execId = await this.machineExecClient.getExecId(machineExec);
            const terminalWidget = await this.terminalWidgetFactory.createWidget({ title: taskConfig.label, terminalId: execId });
            terminalWidget.connectTerminalProcess();

            return {
                kill: () => {
                    throw new Error('Stopping a Che task currently is not supported.');
                },
                getRuntimeInfo: () =>
                    ({
                        taskId: STUB_TASK_ID,
                        ctx: ctx,
                        config: taskConfig,
                        execId
                    })
            };
        } catch (error) {
            console.error('Failed to execute Che command:', error);
            throw new Error(`Failed to execute Che command: ${error.message}`);
        }
    }
}
