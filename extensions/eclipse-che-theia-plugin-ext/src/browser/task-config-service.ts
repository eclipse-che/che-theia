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
  protected readonly onDidStartTaskFailureEmitter = new Emitter<TaskInfo>();
  readonly onDidStartTaskFailure: Event<TaskInfo> = this.onDidStartTaskFailureEmitter.event;

  @inject(CheTaskResolver)
  protected readonly cheTaskResolver: CheTaskResolver;

  protected async runResolvedTask(
    resolvedTask: TaskConfiguration,
    option?: RunTaskOption
  ): Promise<TaskInfo | undefined> {
    const source = resolvedTask._source;
    const taskLabel = resolvedTask.label;

    const terminal = await this.taskTerminalWidgetManager.open(
      this.getFactoryOptions(resolvedTask),
      this.getOpenerOptions(resolvedTask)
    );

    let taskInfo: TaskInfo | undefined;
    try {
      taskInfo = await this.taskServer.run(resolvedTask, this.getContext(), option);
      terminal.start(taskInfo.terminalId);

      this.lastTask = { source, taskLabel, scope: resolvedTask._scope };

      this.logger.debug(`Task created. Task id: ${taskInfo.taskId}`);

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

      if (taskInfo && !this.isRemoteTask(taskInfo.config) && typeof taskInfo.terminalId === 'number') {
        this.shellTerminalServer.onAttachAttempted(taskInfo.terminalId);
      }
      return undefined;
    }
  }

  async attach(terminalId: number, taskInfo: TaskInfo): Promise<number | void> {
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

    return widget.start(terminalId);
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
}
