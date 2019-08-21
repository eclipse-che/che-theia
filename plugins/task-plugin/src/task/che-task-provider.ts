/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import * as che from '@eclipse-che/plugin';
import { Task } from '@theia/plugin';
import { CHE_TASK_TYPE, CheTaskDefinition, Target } from './task-protocol';
import { MachinesPicker } from '../machine/machines-picker';
import { CheWorkspaceClient } from '../che-workspace-client';

/** Reads the commands from the current Che workspace and provides it as Task Configurations. */
@injectable()
export class CheTaskProvider {
    @inject(MachinesPicker)
    protected readonly machinePicker!: MachinesPicker;

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    async provideTasks(): Promise<Task[]> {
        return [];
    }

    async resolveTask(task: Task): Promise<Task> {
        const taskDefinition = task.definition;
        const taskType = taskDefinition.type;
        if (taskType !== CHE_TASK_TYPE) {
            throw new Error(`Unsupported task type: ${taskType}`);
        }

        const cheTaskDefinition = taskDefinition as CheTaskDefinition;
        const target = cheTaskDefinition.target;
        const resultTarget: Target = {};

        if (target && target.workspaceId) {
            resultTarget.workspaceId = target.workspaceId;
        } else {
            resultTarget.workspaceId = await this.cheWorkspaceClient.getWorkspaceId();
        }

        if (target && target.machineName) {
            resultTarget.machineName = target.machineName;
        } else {
            resultTarget.machineName = await this.machinePicker.pick();
        }

        if (target && target.workingDir) {
            resultTarget.workingDir = target.workingDir;
        }

        const command = await che.variables.resolve(cheTaskDefinition.command);
        return {
            definition: {
                type: taskType,
                command: command,
                target: resultTarget,
                previewUrl: cheTaskDefinition.previewUrl
            },
            name: task.name,
            source: task.source,
            execution: task.execution
        };
    }
}
