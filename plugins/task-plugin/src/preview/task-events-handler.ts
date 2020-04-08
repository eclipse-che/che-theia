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

    init(): void {
        theia.tasks.onDidStartTask(async event => {
            const task = event.execution.task;
            if (task.definition.type !== CHE_TASK_TYPE) {
                return;
            }

            await this.onTaskStarted(task);
        }, undefined, startPoint.getSubscriptions());

        theia.tasks.onDidEndTask(async event => {
            const task = event.execution.task;
            if (task.definition.type !== CHE_TASK_TYPE) {
                return;
            }
            await this.onDidEndTask(task);
        }, undefined, startPoint.getSubscriptions());
    }

    async onTaskStarted(task: theia.Task): Promise<void> {
        const cheTaskDefinition = task.definition as CheTaskDefinition;
        const previewUrl = cheTaskDefinition.previewUrl;
        if (!previewUrl) {
            return;
        }

        await this.tasksPreviewManager.onTaskStarted(task);

        const url = await this.previewUrlOpenService.resolve(previewUrl) || previewUrl;

        const mode = this.taskPreviewMode.get();
        switch (mode) {
            case PreviewMode.AlwaysGoTo: {
                this.previewUrlOpenService.previewExternally(url);
                break;
            }
            case PreviewMode.AlwaysPreview: {
                this.previewUrlOpenService.previewInternally(url);
                break;
            }
            case PreviewMode.Off: {
                break;
            }
            default: {

                const message = `Task ${task.name} launched a service on ${url}`;
                this.askUser(message, url);
                break;
            }
        }
    }

    async onDidEndTask(task: theia.Task): Promise<void> {
        const cheTaskDefinition = task.definition as CheTaskDefinition;
        const previewUrl = cheTaskDefinition.previewUrl;
        if (!previewUrl) {
            return;
        }

        await this.tasksPreviewManager.onTaskCompleted(task);
    }

    async askUser(message: string, url: string): Promise<void> {
        const item = await theia.window.showInformationMessage(message, {}, PREVIEW_URL_BUTTON_TEXT, GO_TO_BUTTON_TEXT);

        switch (item) {
            case PREVIEW_URL_BUTTON_TEXT: {
                await this.previewUrlOpenService.previewInternally(url);
                break;
            }
            case GO_TO_BUTTON_TEXT: {
                await this.previewUrlOpenService.previewExternally(url);
                break;
            }
            default: {
                break;
            }
        }
    }
}
