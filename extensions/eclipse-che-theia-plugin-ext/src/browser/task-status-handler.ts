/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { TaskStatusOptions, TerminalWidgetIdentifier } from '@eclipse-che/plugin';
import { Widget, WidgetManager } from '@theia/core/lib/browser';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { inject, injectable } from 'inversify';

const StatusIcon = {
    SUCCESS: 'fa fa-check task-status-success',
    ERROR: 'fa fa-times-circle task-status-error',
    UNKNOWN: 'fa-question'
};

@injectable()
export class TaskStatusHandler {

    @inject(WidgetManager)
    private readonly widgetManager: WidgetManager;

    async setTaskStatus(options: TaskStatusOptions): Promise<void> {
        const terminal = await this.getTerminalWidget(options.terminalIdentifier);
        if (terminal) {
            terminal.title.iconClass = StatusIcon[options.status];
        } else {
            console.log('Failed to set task status: the corresponding terminal is not found');
        }
    }

    protected async getTerminalWidget(terminalIdentifier: TerminalWidgetIdentifier): Promise<TerminalWidget | undefined> {
        const widgets = this.widgetManager.getWidgets(terminalIdentifier.factoryId);

        const widgetId = terminalIdentifier.widgetId;
        if (widgetId !== undefined) {
            return this.getTerminalByWidgetId(widgetId, widgets);
        }

        const processId = terminalIdentifier.processId;
        if (typeof processId === 'number') {
            return this.getTerminalByProcessId(processId, widgets);
        }
    }

    private async getTerminalByWidgetId(id: string, widgets: Widget[]): Promise<TerminalWidget | undefined> {
        const terminalWidget = widgets.find(widget => id === widget.id);
        if (terminalWidget instanceof TerminalWidget) {
            return terminalWidget;
        }
    }

    private async getTerminalByProcessId(id: number, widgets: Widget[]): Promise<TerminalWidget | undefined> {
        for (const widget of widgets) {
            if (!(widget instanceof TerminalWidget)) {
                continue;
            }

            const processId = await (<TerminalWidget>widget).processId;
            if (id === processId) {
                return widget;
            }
        }
    }
}
