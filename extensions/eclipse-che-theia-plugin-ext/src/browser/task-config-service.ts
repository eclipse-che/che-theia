/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CHE_TASK_TYPE, REMOTE_TASK_KIND, TASK_KIND } from './che-task-terminal-widget-manager';
import { Emitter, Event } from '@theia/core';
import { RunTaskOption, TaskConfiguration, TaskInfo, TaskOutputPresentation } from '@theia/task/lib/common';
import { inject, injectable } from 'inversify';

import { CheTaskResolver } from './che-task-resolver';
import { TaskService } from '@theia/task/lib/browser';
import { TaskTerminalWidgetOpenerOptions } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { WidgetOpenMode } from '@theia/core/lib/browser';

@injectable()
export class TaskConfigurationsService extends TaskService {
  private executedTasks: TaskConfiguration[] = [];
  protected readonly onDidStartTaskFailureEmitter = new Emitter<TaskInfo>();
  readonly onDidStartTaskFailure: Event<TaskInfo> = this.onDidStartTaskFailureEmitter.event;

  @inject(CheTaskResolver)
  protected readonly cheTaskResolver: CheTaskResolver;

  protected async runResolvedTask(
    resolvedTask: TaskConfiguration,
    option?: RunTaskOption
  ): Promise<TaskInfo | undefined> {
    // Check if the task was already started running
    const executedTask = this.executedTasks.find(task => this.compareTasks(task, resolvedTask));
    if (!executedTask) {
      // Remember the task, it was started running for the first time
      this.executedTasks.push(resolvedTask);
    } else {
      // Don't run resolved task as it was alredy strted but not registered in task-manager
      return undefined;
    }
    const source = resolvedTask._source;
    const taskLabel = resolvedTask.label;

    const terminal = await this.taskTerminalWidgetManager.open(
      this.getFactoryOptions(resolvedTask),
      this.getOpenerOptions(resolvedTask)
    );
    try {
      const taskInfo = await this.taskServer.run(resolvedTask, this.getContext(), option);
      await terminal.start(taskInfo.terminalId);

      this.lastTask = { source, taskLabel, scope: resolvedTask._scope };

      this.logger.debug(`Task created. Task id: ${taskInfo.taskId}`);

      // Task is running, we can remove it form the list of tasks which are preparing to be run
      this.updateExecutedTasksList(resolvedTask);
      return taskInfo;
    } catch (error) {
      this.onDidStartTaskFailureEmitter.fire({
        config: resolvedTask,
        kind: terminal.kind,
        terminalId: terminal.terminalId,
        taskId: -1,
      });

      const errorMessage = `Error launching task '${taskLabel}': ${error.message}`;
      terminal.writeLine(`\x1b[31m ${errorMessage} \x1b[0m\n`);

      console.error(errorMessage, error);
      this.messageService.error(errorMessage);

      this.updateExecutedTasksList(resolvedTask);
      return undefined;
    }
  }

  async attach(terminalId: number, taskId: number): Promise<void> {
    const runningTasks = await this.getRunningTasks();

    const taskInfo = runningTasks.find((t: TaskInfo) => t.taskId === taskId);
    if (taskInfo) {
      const kind = this.isRemoteTask(taskInfo.config) ? REMOTE_TASK_KIND : TASK_KIND;
      const terminalWidget = this.terminalService.all.find(
        terminal => terminal.kind === kind && terminal.terminalId === terminalId
      );
      if (terminalWidget) {
        // Task is already running in terminal
        return this.terminalService.open(terminalWidget, { mode: 'activate' });
      }
    }

    const taskConfig = taskInfo ? taskInfo.config : undefined;
    const widget = await this.taskTerminalWidgetManager.open(
      this.getFactoryOptions(taskConfig),
      this.getOpenerOptions(taskConfig)
    );

    widget.start(terminalId);
  }

  protected getFactoryOptions(config?: TaskConfiguration): TerminalWidgetFactoryOptions {
    const isRemote = config ? this.isRemoteTask(config) : false;

    return {
      kind: isRemote ? REMOTE_TASK_KIND : TASK_KIND,
      title: isRemote && config ? config.label : config ? `Task: ${config.label}` : 'Task',
      created: new Date().toString(),
      destroyTermOnClose: true,
      attributes: {
        remote: isRemote ? 'true' : 'false',
        closeWidgetExitOrError: 'false',
        interruptProcessOnClose: 'true',
        TERMINAL_COMPONENT_NAME: isRemote ? this.getContainerName(config) || '' : '',
      },
    };
  }

  protected getOpenerOptions(taskConfig?: TaskConfiguration): TaskTerminalWidgetOpenerOptions {
    return {
      widgetOptions: { area: 'bottom' },
      mode: this.getWidgetOpenMode(taskConfig),
      taskConfig,
    };
  }

  protected getWidgetOpenMode(config?: TaskConfiguration): WidgetOpenMode {
    if (!config || !TaskOutputPresentation.shouldAlwaysRevealTerminal(config)) {
      return 'open';
    }

    if (TaskOutputPresentation.shouldSetFocusToTerminal(config)) {
      return 'activate';
    }
    return 'reveal';
  }

  protected getContainerName(config?: TaskConfiguration): string | undefined {
    if (config && config.target && config.target.containerName) {
      return config.target.containerName;
    }
    return undefined;
  }

  protected isRemoteTask(task: TaskConfiguration): boolean {
    const target = task.target;
    return (target && target.containerName) || (target && target.component) || task.type === CHE_TASK_TYPE; // unresolved task doesn't have 'containerName'
  }

  private compareTasks(one: TaskConfiguration, other: TaskConfiguration): boolean {
    return one.type === other.type && one.label === other.label && one._source === other._source;
  }

  private updateExecutedTasksList(resolvedTask: TaskConfiguration): void {
    this.executedTasks.forEach((element, index) => {
      if (this.compareTasks(element, resolvedTask)) {
        this.executedTasks.splice(index, 1);
      }
    });
  }
}
