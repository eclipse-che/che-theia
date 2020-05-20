/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { TaskStatusOptions } from '@eclipse-che/plugin';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { inject, injectable, postConstruct } from 'inversify';
import { CheTaskTerminalWidgetManager } from './che-task-terminal-widget-manager';
import { TaskConfigurationsService } from './task-config-service';

const StatusIcon = {
    SUCCESS: 'fa fa-check',
    ERROR: 'fa fa-times-circle',
    IN_PROGRESS: 'task-status-in-progress',
    UNKNOWN: 'fa-question'
};

enum TaskStatus {
    Success = 'SUCCESS',
    Error = 'ERROR',
    InProgress = 'IN_PROGRESS',
    Unknown = 'UNKNOWN'
}

@injectable()
export class TaskStatusHandler {

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @inject(TaskConfigurationsService)
    protected readonly taskService: TaskConfigurationsService;

    @inject(CheTaskTerminalWidgetManager)
    protected readonly cheTaskTerminalWidgetManager: CheTaskTerminalWidgetManager;

    @postConstruct()
    protected init(): void {
        this.terminalService.onDidCreateTerminal(async (terminal: TerminalWidget) => {
            if (this.cheTaskTerminalWidgetManager.isTaskTerminal(terminal)) {
                this.setStatus(TaskStatus.InProgress, terminal);

                this.subscribeOnTaskTerminalEvents(terminal);
            }
        });

        this.taskService.onDidStartTaskFailure(taskInfo => {
            const kind = taskInfo.kind;
            const terminalId = taskInfo.terminalId;

            if (kind && terminalId) {
                const status = TaskStatus.Error;
                const terminalIdentifier = { kind, terminalId };

                this.setTaskStatus({ status, terminalIdentifier });
            }
        });

        this.handleOpenTerminals();
    }

    async setTaskStatus(options: TaskStatusOptions): Promise<void> {
        const terminalIdentifier = options.terminalIdentifier;
        const kind = terminalIdentifier.kind;
        const terminalId = terminalIdentifier.terminalId;

        const terminalWidget = this.terminalService.all.find(terminal => kind === terminal.kind && terminalId === terminal.terminalId);
        this.setStatus(options.status, terminalWidget);
    }

    setStatus(status: TaskStatus, terminal?: TerminalWidget): void {
        if (!terminal) {
            console.log('Failed to set task status: the corresponding terminal is not found');
            return;
        }

        const currentIcon = terminal.title.iconClass;
        const newStatusIcon = StatusIcon[status];
        if (currentIcon !== newStatusIcon) {
            terminal.title.iconClass = newStatusIcon;
        }
    }

    private async handleOpenTerminals(): Promise<void> {
        const taskTerminals = this.cheTaskTerminalWidgetManager.getTaskTerminals();
        for (const terminal of taskTerminals) {
            try {
                const processId = await terminal.processId;
                if (processId) {
                    this.setStatus(TaskStatus.InProgress, terminal);
                }
            } catch (error) {
                // an error is thrown if a terminal is not started, we are trying to get a process ID for started terminals
            }
        }
    }

    private subscribeOnTaskTerminalEvents(terminal: TerminalWidget): void {
        const didOpenListener = terminal.onDidOpen(async () => {
            this.setStatus(TaskStatus.InProgress, terminal);
        });

        const didOpenFailureListener = terminal.onDidOpenFailure(async () => {
            this.setStatus(TaskStatus.Error, terminal);
        });

        terminal.onDidDispose(() => {
            didOpenListener.dispose();
            didOpenFailureListener.dispose();
        });
    }
}
