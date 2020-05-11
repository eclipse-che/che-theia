/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TaskTerminalWidgetManager, TaskTerminalWidgetOpenerOptions, TaskTerminalWidget } from '@theia/task/lib/browser/task-terminal-widget-manager';
import { TerminalWidget, TerminalWidgetOptions } from '@theia/terminal/lib/browser/base/terminal-widget';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget-impl';
import { injectable } from 'inversify';

export const CHE_TASK_TYPE: string = 'che';
export const TASK_KIND: string = 'task';
export const REMOTE_TASK_KIND: string = 'remote-task';

export interface RemoteTaskTerminalWidget extends TerminalWidget {
    readonly kind: 'remote-task';
}
export namespace RemoteTaskTerminalWidget {
    export function is(widget: TerminalWidget): widget is RemoteTaskTerminalWidget {
        return widget.kind === REMOTE_TASK_KIND;
    }
}

export namespace RemoteTerminalOptions {
    export function isRemoteTerminal(options: TerminalWidgetOptions): boolean {
        const attributes = options.attributes;
        if (!attributes) {
            return false;
        }

        const containerName = attributes['CHE_MACHINE_NAME'];
        if (containerName) {
            return true;
        }

        const isRemoteValue = attributes['remote'];
        if (isRemoteValue) {
            return isRemoteValue.toLowerCase() === 'true' ? true : false;
        }
        return false;
    }
}

@injectable()
export class CheTaskTerminalWidgetManager extends TaskTerminalWidgetManager {

    async newTaskTerminal(factoryOptions: TerminalWidgetFactoryOptions): Promise<TerminalWidget> {
        const attributes = factoryOptions.attributes || {};
        if (!RemoteTerminalOptions.isRemoteTerminal(factoryOptions)) {
            attributes['remote'] = 'false';
        }

        return this.terminalService.newTerminal({ ...factoryOptions, attributes });
    }

    async open(factoryOptions: TerminalWidgetFactoryOptions, openerOptions: TaskTerminalWidgetOpenerOptions): Promise<TerminalWidget> {
        if (RemoteTerminalOptions.isRemoteTerminal(factoryOptions)) {
            const terminal = await this.newTaskTerminal(factoryOptions);
            this.terminalService.open(terminal, openerOptions);
            return terminal;
        }

        return super.open(factoryOptions, openerOptions);
    }

    getTaskTerminals(): TerminalWidget[] {
        return this.terminalService.all.filter(terminal => this.isTaskTerminal(terminal));
    }

    isTaskTerminal(terminal: TerminalWidget): boolean {
        return TaskTerminalWidget.is(terminal) || RemoteTaskTerminalWidget.is(terminal);
    }
}
