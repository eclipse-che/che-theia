/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import * as che from '@eclipse-che/plugin';
import { ShellExecution, Task } from '@theia/plugin';
import { inject, injectable } from 'inversify';
import { CheWorkspaceClient } from '../che-workspace-client';
import { COMPONENT_ATTRIBUTE, MachinesPicker } from '../machine/machines-picker';
import { getAttribute } from '../utils';
import { CheTaskDefinition, CHE_TASK_TYPE, Target } from './task-protocol';

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

        resultTarget.containerName = await this.getContainerName(target);

        if (target && target.workingDir) {
            resultTarget.workingDir = await che.variables.resolve(target.workingDir);
        }

        const execution = task.execution as ShellExecution;
        if (execution && execution.commandLine) {
            execution.commandLine = await che.variables.resolve(execution.commandLine as string);
        }

        return {
            definition: {
                type: taskType,
                target: resultTarget,
                previewUrl: cheTaskDefinition.previewUrl
            },
            name: task.name,
            source: task.source,
            execution: execution
        };
    }

    private async getContainerName(target?: Target): Promise<string> {
        if (!target) {
            return this.machinePicker.pick();
        }

        const containers = await this.cheWorkspaceClient.getMachines();

        const containerName = target.containerName;
        if (containerName && containers.hasOwnProperty(containerName)) {
            return containerName;
        }

        return await this.getContainerNameByComponent(target.component, containers) || this.machinePicker.pick();
    }

    private async getContainerNameByComponent(targetComponent: string | undefined, containers: { [attrName: string]: cheApi.workspace.Machine }): Promise<string | undefined> {
        if (!targetComponent) {
            return undefined;
        }

        const names = [];
        for (const containerName in containers) {
            if (!containers.hasOwnProperty(containerName)) {
                continue;
            }

            const container = containers[containerName];
            const component = getAttribute(COMPONENT_ATTRIBUTE, container.attributes);
            if (component && component === targetComponent) {
                names.push(containerName);
            }
        }

        if (names.length === 1) {
            return names[0];
        }

        if (names.length > 1) {
            return this.machinePicker.pick(names);
        }
        return undefined;
    }
}
