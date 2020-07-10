/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import * as theia from '@theia/plugin';
import * as startPoint from '../task-plugin-backend';
import { PreviewUrlsWidgetFactory } from './previews-widget';
import * as path from 'path';
import { PreviewUrlOpenService } from './preview-url-open-service';

export const PREVIEW_URL_TITLE = 'Preview URLs';
export const PREVIEW_URL_VIEW_TYPE = 'PreviewUrlView';
export const EXTERNALLY_CHOICE = 'externally';
export const INTERNALLY_CHOICE = 'internally';

export const STATUS_BAR_PREVIEW = {
    id: 'show.preview.urls',
    label: 'Show Preview URLs',
    title: 'Previews'
};

@injectable()
export class TasksPreviewManager {

    private currentPanel: theia.WebviewPanel | undefined;

    @inject(PreviewUrlsWidgetFactory)
    protected readonly previewUrlsWidgetFactory!: PreviewUrlsWidgetFactory;

    @inject(PreviewUrlOpenService)
    protected readonly previewUrlOpenService!: PreviewUrlOpenService;

    init(): void {
        this.setStatusBarPreviewUrlItem();
    }

    async showPreviews(): Promise<void> {
        const executions = theia.tasks.taskExecutions;
        const tasks = executions.map(execution => execution.task);
        const filteredTasks = tasks.filter(task => {
            if (task.definition.previewUrl) {
                return true;
            }
            return false;
        });

        const previewsWidget = await this.previewUrlsWidgetFactory.createWidget({ tasks: filteredTasks });

        const panel = this.providePanel();
        panel.webview.html = await previewsWidget.getHtml();
        panel.reveal(undefined, undefined, true);
    }

    async onTaskStarted(task: theia.Task): Promise<void> {
        await this.showPreviews();
    }

    async onTaskCompleted(task: theia.Task): Promise<void> {
        if (this.currentPanel && this.currentPanel.visible) {
            await this.showPreviews();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async onMessageReceived(message: any): Promise<void> {
        if (message.command !== 'preview') {
            return;
        }

        const url = message.url;
        if (EXTERNALLY_CHOICE === message.choice) {
            await this.previewUrlOpenService.previewExternally(url);
            return;
        }

        if (INTERNALLY_CHOICE === message.choice) {
            await this.previewUrlOpenService.previewInternally(url);
        }
    }

    private providePanel(): theia.WebviewPanel {
        if (this.currentPanel) {
            return this.currentPanel;
        }

        this.currentPanel = theia.window.createWebviewPanel(PREVIEW_URL_VIEW_TYPE, PREVIEW_URL_TITLE, { area: theia.WebviewPanelTargetArea.Bottom, preserveFocus: true }, {
            enableScripts: true,
            localResourceRoots: [theia.Uri.file(path.join(startPoint.getContext().extensionPath, 'resources'))]
        });

        const context = startPoint.getContext();
        this.currentPanel.webview.onDidReceiveMessage(async message => await this.onMessageReceived(message), undefined, context.subscriptions);
        this.currentPanel.onDidDispose(() => { this.currentPanel = undefined; }, undefined, context.subscriptions);
        this.currentPanel.onDidChangeViewState(async event => {
            if (event.webviewPanel.active) {
                await this.showPreviews();
            }
        }, undefined, context.subscriptions);

        return this.currentPanel;
    }

    private async setStatusBarPreviewUrlItem(): Promise<void> {
        const previewCommandSubscription = theia.commands.registerCommand(STATUS_BAR_PREVIEW, async () => {
            if (this.currentPanel && this.currentPanel.visible) {
                this.currentPanel.dispose();
            } else {
                await this.showPreviews();
            }
        });
        startPoint.getSubscriptions().push(previewCommandSubscription);

        const item = theia.window.createStatusBarItem(theia.StatusBarAlignment.Left);

        item.text = `$(link) ${STATUS_BAR_PREVIEW.title}`;
        item.tooltip = STATUS_BAR_PREVIEW.label;
        item.command = STATUS_BAR_PREVIEW.id;
        item.show();
    }
}
