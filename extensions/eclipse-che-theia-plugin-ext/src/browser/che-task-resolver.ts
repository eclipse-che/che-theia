/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DevfileComponentStatus, DevfileService } from '@eclipse-che/theia-remote-api/lib/common/devfile-service';
import { TaskResolver, TaskResolverRegistry } from '@theia/task/lib/browser';
import { inject, injectable, postConstruct } from 'inversify';

import { ContainerPicker } from './container-picker';
import { TaskConfiguration } from '@theia/task/lib/common';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

@injectable()
export class CheTaskResolver implements TaskResolver {
  @inject(WorkspaceService)
  protected readonly workspaceService: WorkspaceService;

  @inject(DevfileService)
  protected readonly devfileService: DevfileService;

  @inject(VariableResolverService)
  protected readonly variableResolverService: VariableResolverService;

  @inject(ContainerPicker)
  protected readonly containerPicker: ContainerPicker;

  @inject(TaskResolverRegistry)
  protected readonly taskResolverRegistry: TaskResolverRegistry;

  private workspaceId: string | undefined;
  private componentStatuses: DevfileComponentStatus[];

  @postConstruct()
  protected init(): void {
    this.taskResolverRegistry.register('che', this);

    this.getWorkspaceId();
    this.getComponentStatuses();
  }

  async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
    const taskType = taskConfig.type;
    if (taskType !== 'che') {
      throw new Error(`Unsupported task type: ${taskType}`);
    }

    const target = taskConfig.target;
    const resultTarget: { [key: string]: string | undefined } = {};

    resultTarget.workspaceId = target && target.workspaceId ? target.workspaceId : await this.getWorkspaceId();
    resultTarget.containerName = await this.getContainerName(target);

    const variableResolverOptions = { configurationSection: 'tasks' };
    if (target && target.workingDir) {
      resultTarget.workingDir = await this.variableResolverService.resolve(target.workingDir, variableResolverOptions);
    }

    let commandLine = undefined;
    const command = taskConfig.command;
    if (command) {
      commandLine = (await this.variableResolverService.resolve(command, variableResolverOptions)) || command;
    }

    return { ...taskConfig, command: commandLine, target: resultTarget };
  }

  private async getContainerName(target?: { containerName?: string; component?: string }): Promise<string> {
    if (!target) {
      return this.containerPicker.pick();
    }

    const containers = await this.getComponentStatuses();

    const containerName = target && target.containerName;
    if (containerName && containers.find(container => container.name === containerName)) {
      return containerName;
    }

    return (await this.getContainerNameByComponent(target && target.component)) || this.containerPicker.pick();
  }

  private async getContainerNameByComponent(targetComponent: string | undefined): Promise<string | undefined> {
    if (!targetComponent) {
      return undefined;
    }

    const components = await this.getComponentStatuses();
    const containers = components
      .filter(component => component.name === targetComponent)
      .map(container => container.name);

    if (containers.length === 1) {
      return containers[0];
    }

    if (containers.length > 1) {
      return this.containerPicker.pick(containers);
    }
    return undefined;
  }

  private async getWorkspaceId(): Promise<string | undefined> {
    if (this.workspaceId) {
      return this.workspaceId;
    }

    this.workspaceId = await this.workspaceService.getCurrentWorkspaceId();
    return this.workspaceId;
  }

  private async getComponentStatuses(): Promise<DevfileComponentStatus[]> {
    if (!this.componentStatuses) {
      this.componentStatuses = await this.devfileService.getComponentStatuses();
    }

    return this.componentStatuses;
  }
}

export function getAttribute(attributeName: string, attributes?: { [key: string]: string }): string | undefined {
  if (!attributes) {
    return undefined;
  }

  for (const attribute in attributes) {
    if (attribute === attributeName) {
      return attributes[attribute];
    }
  }
  return undefined;
}
