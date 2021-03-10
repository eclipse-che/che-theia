/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';

import { CHE_TASK_TYPE, CheTaskDefinition, Target } from './task-protocol';
import { ShellExecution, Task } from '@theia/plugin';
import { inject, injectable } from 'inversify';

import { CheWorkspaceClient } from '../che-workspace-client';
import { MachinesPicker } from '../machine/machines-picker';

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

    if (target && target.component) {
      resultTarget.component = target.component;
    } else {
      resultTarget.component = await this.machinePicker.pick();
    }

    if (target && target.workingDir) {
      resultTarget.workingDir = await che.variables.resolve(target.workingDir);
    }

    const execution = task.execution as ShellExecution;
    if (execution && execution.commandLine) {
      execution.commandLine = await che.variables.resolve(execution.commandLine);
    }

    return {
      definition: {
        type: taskType,
        target: resultTarget,
        previewUrl: cheTaskDefinition.previewUrl,
      },
      name: task.name,
      source: task.source,
      execution: execution,
    };
  }
}
