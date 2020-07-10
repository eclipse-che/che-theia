/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import * as path from 'path';
import * as startPoint from '../task-plugin-backend';
import { injectable, inject } from 'inversify';
import { EXTERNALLY_CHOICE, INTERNALLY_CHOICE, PREVIEW_URL_TITLE } from './tasks-preview-manager';
import { PreviewUrlOpenService } from './preview-url-open-service';

const GO_TO_BUTTON_NAME = 'Go To';
const PREVIEW_BUTTON_NAME = 'Preview';
const PLACEHOLDER = 'No Che tasks with a preview URL are running';

export const PreviewUrlsWidgetFactory = Symbol('PreviewUrlsWidgetFactory');
export interface PreviewUrlsWidgetFactory {
    createWidget(options: PreviewUrlsWidgetOptions): Promise<PreviewUrlsWidget>;
}

export const PreviewUrlsWidgetOptions = Symbol('PreviewUrlsWidgetOptions');
export interface PreviewUrlsWidgetOptions {
    tasks: theia.Task[];
}

@injectable()
export class PreviewUrlsWidget {

    @inject(PreviewUrlsWidgetOptions)
    private readonly options!: PreviewUrlsWidgetOptions;

    @inject(PreviewUrlOpenService)
    private readonly previewUrlOpenService: PreviewUrlOpenService;

    async getHtml(): Promise<string> {
        const context = startPoint.getContext();
        const scriptPathOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'preview-urls.js'));
        const scriptUri = scriptPathOnDisk.with({ scheme: 'theia-resource' });

        const cssPathOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'preview-urls-view.css'));
        const cssUri = cssPathOnDisk.with({ scheme: 'theia-resource' });

        const rendering = await this.render();
        return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    font-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; script-src 'unsafe-inline' 'self' ;">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" type="text/css" href="${cssUri}">
                    </style>
                    <title>${PREVIEW_URL_TITLE}</title>
                </head>

                <body>
                  ${rendering}
                  <script src="${scriptUri}"></script>
                </body>
                </html>`;
    }

    private async render(): Promise<string> {
        if (this.options.tasks.length < 1) {
            return `<div class='previews-placeholder'>${PLACEHOLDER}</div>`;
        }

        const previews = (await this.renderPreviews()).join('');
        return `<div class='previews-container'>${previews}</div>`;
    }

    private async renderPreviews(): Promise<Array<string>> {
        const previews = [];
        for (const cheTask of this.options.tasks) {
            const previewUrl = cheTask.definition.previewUrl;
            const url = await this.previewUrlOpenService.resolve(previewUrl);

            const server = `<a class="task-link" href="${url}" target="_blank">${url}</a>`;
            const taskLabel = `<label>${cheTask.name}</label>`;
            const previewButton = `<button class='button' type="button" onclick="preview('${INTERNALLY_CHOICE}', '${url}')">${PREVIEW_BUTTON_NAME}</button>`;
            const goToButton = `<button class='button' type="button" onclick="preview('${EXTERNALLY_CHOICE}', '${url}')">${GO_TO_BUTTON_NAME}</button>`;

            previews.push(this.renderTemplate(server, taskLabel, previewButton, goToButton));
        }
        return previews;
    }

    private renderTemplate(server: string, taskLabel: string, previewButton: string, goToButton: string): string {
        return `<div class='preview'>
                    <div class='previews-labels-part'>
                            <div class='server-label'>
                                ${server}
                            </div>
                            <div class='task-label'>
                                ${taskLabel}
                            </div>
                    </div>
                    <div class='previews-buttons-part'>
                            <div class='button'>
                                ${previewButton}
                            </div>
                            <div class='button'>
                                ${goToButton}
                            </div>
                    </div>
                </div>`;
    }
}
