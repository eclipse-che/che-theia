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
import { inject, injectable } from 'inversify';
import { TaskConfigurationsService } from './task-config-service';

const StatusIcon = {
    SUCCESS: 'fa fa-check task-status-success',
    ERROR: 'fa fa-times-circle task-status-error',
    UNKNOWN: 'fa-question'
};

enum TaskStatus {
    Success = 'SUCCESS',
    Error = 'ERROR',
    Unknown = 'UNKNOWN'
}

@injectable()
export class TaskStatusHandler {

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @inject(TaskConfigurationsService)
    protected readonly taskService: TaskConfigurationsService;

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
}
