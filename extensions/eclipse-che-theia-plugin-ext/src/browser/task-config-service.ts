/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { WidgetOpenMode } from '@theia/core/lib/browser';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TaskInfo, TaskOutputPresentation, TaskConfiguration } from '@theia/task/lib/common';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';

export class TaskConfigurationsService extends TaskService {

    async attach(terminalId: number, taskId: number): Promise<void> {
        const runningTasks = await this.getRunningTasks();
        const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
        if (taskInfo) {
            const terminalWidget = this.terminalService.getByTerminalId(terminalId);
            if (terminalWidget) { // Task is already running in terminal
                return this.terminalService.open(terminalWidget, { mode: 'activate' });
            }
        }

        const widget = await this.taskTerminalWidgetManager.open(
            this.getFactoryOptions(taskId, terminalId, taskInfo),
            this.getOpenerOptions(taskId, taskInfo));

        widget.start(terminalId);
    }

    protected getFactoryOptions(taskId: number, terminalId: number, taskInfo?: TaskInfo): TerminalWidgetFactoryOptions {
        return {
            id: this.getTerminalWidgetId(terminalId),
            title: taskInfo
                ? `Task: ${taskInfo.config.label}`
                : `Task: #${taskId}`,
            created: new Date().toString(),
            destroyTermOnClose: true,
            attributes: {
                'remote': taskInfo && this.isRemoteTask(taskInfo.config) ? 'true' : 'false'
            }
        };
    }

    protected getOpenerOptions(taskId: number, taskInfo?: TaskInfo): TaskTerminalWidgetOpenerOptions {
        return {
            taskId,
            widgetOptions: { area: 'bottom' },
            mode: this.getWidgetOpenMode(taskInfo),
            taskInfo
        };
    }

    protected getWidgetOpenMode(taskInfo?: TaskInfo): WidgetOpenMode {
        if (!taskInfo || !TaskOutputPresentation.shouldAlwaysRevealTerminal(taskInfo.config)) {
            return 'open';
        }

        if (TaskOutputPresentation.shouldSetFocusToTerminal(taskInfo.config)) {
            return 'activate';
        }
        return 'reveal';
    }

    protected isRemoteTask(task: TaskConfiguration): boolean {
        return task.target && task.target.containerName;
    }
}
