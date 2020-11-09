/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { TaskResolver, TaskResolverRegistry } from '@theia/task/lib/browser';
import { TaskConfiguration } from '@theia/task/lib/common';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { inject, injectable, postConstruct } from 'inversify';
import { ContainerPicker } from './container-picker';

const COMPONENT_ATTRIBUTE: string = 'component';

@injectable()
export class CheTaskResolver implements TaskResolver {

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    @inject(ContainerPicker)
    protected readonly containerPicker: ContainerPicker;

    @inject(TaskResolverRegistry)
    protected readonly taskResolverRegistry: TaskResolverRegistry;

    private workspaceId: string | undefined;
    private containers: { name: string, container: cheApi.workspace.Machine }[] = [];

    @postConstruct()
    protected init(): void {
        this.taskResolverRegistry.register('che', this);

        this.getWorkspaceId();
        this.getWorkspaceContainers();
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
            commandLine = await this.variableResolverService.resolve(command, variableResolverOptions) || command;
        }

        return { ...taskConfig, command: commandLine, target: resultTarget };
    }

    private async getContainerName(target?: { containerName?: string, component?: string }): Promise<string> {
        if (!target) {
            return this.containerPicker.pick();
        }

        const containers = await this.getWorkspaceContainers();

        const containerName = target && target.containerName;
        if (containerName && containers.find(container => container.name === containerName)) {
            return containerName;
        }

        return await this.getContainerNameByComponent(target && target.component) || this.containerPicker.pick();
    }

    private async getContainerNameByComponent(targetComponent: string | undefined): Promise<string | undefined> {
        if (!targetComponent) {
            return undefined;
        }

        const containers = await this.getWorkspaceContainers();
        const names = [];
        for (const containerEntity of containers) {
            const container = containerEntity.container;
            const component = getAttribute(COMPONENT_ATTRIBUTE, container.attributes);
            if (component && component === targetComponent) {
                names.push(containerEntity.name);
            }
        }

        if (names.length === 1) {
            return names[0];
        }

        if (names.length > 1) {
            return this.containerPicker.pick(names);
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

    private async getWorkspaceContainers(): Promise<{ name: string, container: cheApi.workspace.Machine }[]> {
        if (this.containers.length > 0) {
            return this.containers;
        }

        this.containers = [];
        try {
            const containersList = await this.workspaceService.getCurrentWorkspacesContainers();
            for (const containerName in containersList) {
                if (!containersList.hasOwnProperty(containerName)) {
                    continue;
                }
                const container = { name: containerName, container: containersList[containerName] };
                this.containers.push(container);
            }
        } catch (e) {
            throw new Error('Unable to get list workspace containers. Cause: ' + e);
        }

        return this.containers;
    }
}

export function getAttribute(attributeName: string, attributes?: { [key: string]: string; }): string | undefined {
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
