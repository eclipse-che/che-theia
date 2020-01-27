/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as startPoint from '../task-plugin-backend';
import { CHE_TASK_TYPE } from './task-protocol';
import { injectable } from 'inversify';

const TERMINAL_WIDGET_FACTORY_ID = 'terminal';
const REMOTE_TERMINAL_WIDGET_FACTORY_ID = 'remote-terminal';

@injectable()
export class TaskStatusHandler {

    init() {
        che.task.onDidEndTask(async (event: che.TaskExitedEvent) => {
            const status = this.getTaskStatus(event);
            const terminalIdentifier = this.getTerminalIdentifier(event);

            che.task.setTaskStatus({ status, terminalIdentifier });
        }, undefined, startPoint.getSubscriptions());
    }

    private getTerminalIdentifier(event: che.TaskInfo | che.TaskExitedEvent): che.TerminalWidgetIdentifier {
        const taskConfig = event.config;
        if (taskConfig && taskConfig.type === CHE_TASK_TYPE) {
            return { factoryId: REMOTE_TERMINAL_WIDGET_FACTORY_ID, processId: event.processId };
        } else {
            const terminalWidgetId = `${TERMINAL_WIDGET_FACTORY_ID}-${event.terminalId}`;
            return { factoryId: TERMINAL_WIDGET_FACTORY_ID, widgetId: terminalWidgetId };
        }
    }

    private getTaskStatus(event: che.TaskInfo | che.TaskExitedEvent): che.TaskStatus {
        if (event.signal !== undefined) {
            return che.TaskStatus.Error;
        }

        if (event.code === undefined) {
            return che.TaskStatus.Unknown;
        }

        if (event.code === 0) {
            return che.TaskStatus.Success;
        } else {
            return che.TaskStatus.Error;
        }
    }
}
