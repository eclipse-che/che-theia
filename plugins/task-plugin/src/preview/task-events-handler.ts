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
import { CheTaskDefinition, CHE_TASK_TYPE } from '../task/task-protocol';
import { CheTaskPreviewMode, PreviewMode } from './task-preview-mode';
import { PreviewUrlOpenService } from './preview-url-open-service';
import { TasksPreviewManager } from './tasks-preview-manager';

const GO_TO_BUTTON_TEXT = 'Go To';
const PREVIEW_URL_BUTTON_TEXT = 'Preview';

@injectable()
export class CheTaskEventsHandler {

    @inject(CheTaskPreviewMode)
    protected readonly taskPreviewMode!: CheTaskPreviewMode;

    @inject(PreviewUrlOpenService)
    protected readonly previewUrlOpenService!: PreviewUrlOpenService;

    @inject(TasksPreviewManager)
    protected readonly tasksPreviewManager!: TasksPreviewManager;

    init() {
        theia.tasks.onDidStartTask(event => {
            const task = event.execution.task;
            if (task.definition.type !== CHE_TASK_TYPE) {
                return;
            }

            this.onTaskStarted(task);
        }, undefined, startPoint.getSubscriptions());

        theia.tasks.onDidEndTask(event => {
            const task = event.execution.task;
            if (task.definition.type !== CHE_TASK_TYPE) {
                return;
            }
            this.onDidEndTask(task);
        }, undefined, startPoint.getSubscriptions());
    }

    onTaskStarted(task: theia.Task): void {
        const cheTaskDefinition = task.definition as CheTaskDefinition;
        const previewUrl = cheTaskDefinition.previewUrl;
        if (!previewUrl) {
            return;
        }

        this.tasksPreviewManager.onTaskStarted(task);

        const mode = this.taskPreviewMode.get();
        switch (mode) {
            case PreviewMode.AlwaysGoTo: {
                this.previewUrlOpenService.previewExternally(previewUrl);
                break;
            }
            case PreviewMode.AlwaysPreview: {
                this.previewUrlOpenService.previewInternally(previewUrl);
                break;
            }
            case PreviewMode.Off: {
                break;
            }
            default: {
                const message = `Task ${task.name} launched a service on ${previewUrl}`;
                this.askUser(message, previewUrl);
                break;
            }
        }
    }

    onDidEndTask(task: theia.Task): void {
        const cheTaskDefinition = task.definition as CheTaskDefinition;
        const previewUrl = cheTaskDefinition.previewUrl;
        if (!previewUrl) {
            return;
        }

        this.tasksPreviewManager.onTaskCompleted(task);
    }

    async askUser(message: string, url: string) {
        const item = await theia.window.showInformationMessage(message, {}, PREVIEW_URL_BUTTON_TEXT, GO_TO_BUTTON_TEXT);

        switch (item) {
            case PREVIEW_URL_BUTTON_TEXT: {
                this.previewUrlOpenService.previewInternally(url);
                break;
            }
            case GO_TO_BUTTON_TEXT: {
                this.previewUrlOpenService.previewExternally(url);
                break;
            }
            default: {
                break;
            }
        }
    }
}
