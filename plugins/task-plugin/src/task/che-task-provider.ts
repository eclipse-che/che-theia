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
import { che as cheApi } from '@eclipse-che/api';
import { Task } from '@theia/plugin';
import { CHE_TASK_TYPE, MACHINE_NAME_ATTRIBUTE, PREVIEW_URL_ATTRIBUTE, WORKING_DIR_ATTRIBUTE, CheTaskDefinition, Target } from './task-protocol';
import { MachinesPicker } from '../machine/machines-picker';
import { CheWorkspaceClient } from '../che-workspace-client';
import { VSCODE_LAUNCH_TYPE } from '../export/launch-configs-exporter';
import { VSCODE_TASK_TYPE } from '../export/task-configs-exporter';

/** Reads the commands from the current Che workspace and provides it as Task Configurations. */
@injectable()
export class CheTaskProvider {
    @inject(MachinesPicker)
    protected readonly machinePicker!: MachinesPicker;

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    async provideTasks(): Promise<Task[]> {
        const commands = await this.cheWorkspaceClient.getCommands();
        const filteredCommands = commands.filter(command =>
            command.type !== VSCODE_TASK_TYPE &&
            command.type !== VSCODE_LAUNCH_TYPE);
        return filteredCommands.map(command => this.toTask(command));
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

    private toTask(command: cheApi.workspace.Command): Task {
        return {
            definition: {
                type: CHE_TASK_TYPE,
                command: command.commandLine,
                target: {
                    workingDir: this.getCommandAttribute(command, WORKING_DIR_ATTRIBUTE),
                    machineName: this.getCommandAttribute(command, MACHINE_NAME_ATTRIBUTE)
                },
                previewUrl: this.getCommandAttribute(command, PREVIEW_URL_ATTRIBUTE)
            },
            name: `${command.name}`,
            source: CHE_TASK_TYPE,
        };
    }

    private getCommandAttribute(command: cheApi.workspace.Command, attrName: string): string | undefined {
        if (!command.attributes) {
            return undefined;
        }

        for (const attr in command.attributes) {
            if (attr === attrName) {
                return command.attributes[attr];
            }
        }
        return undefined;
    }
}
