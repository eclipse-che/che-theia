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
import { WelcomePage } from './welcome-page';
import * as che from '@eclipse-che/plugin';

export namespace Settings {
    export const CHE_CONFIGURATION = 'che';
    export const SHOW_WELCOME_PAGE = 'welcome.enable';
}

export const welcomePageViewType = 'WelcomePage';

async function getHtmlForWebview(context: theia.PluginContext): Promise<string> {
    // Local path to main script run in the webview
    const scriptPathOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'welcome-page.js'));
    // And the uri we use to load this script in the webview
    const scriptUri = scriptPathOnDisk.with({ scheme: 'theia-resource' });

    // Local path to main script run in the webview
    const cssPathOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'welcome-page.css'));
    // And the uri we use to load this script in the webview
    const cssUri = cssPathOnDisk.with({ scheme: 'theia-resource' });

    const welcomePage = new WelcomePage();
    const rendering = await welcomePage.render();
    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline' 'self';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" type="text/css" href="${cssUri}">
                </style>
                <title>Welcome Page</title>
            </head>

            <body>
              ${rendering}
              <script src="${scriptUri}"></script>
            </body>
            </html>`;

}

// Open Readme file is there is one
export async function handleReadmeFiles(): Promise<void> {
    const roots: theia.WorkspaceFolder[] | undefined = theia.workspace.workspaceFolders;
    // In case of only one workspace
    if (roots && roots.length === 1) {
        const children = await theia.workspace.findFiles('README.md', 'node_modules/**', 1);
        const updatedChildren = children.filter((child: theia.Uri) => {
            if (child.fsPath.indexOf('node_modules') === -1) {
                return child;
            }

        });

        if (updatedChildren.length >= 1) {
            const openPath = theia.Uri.parse(updatedChildren[0] + '?open-handler=code-editor-preview');
            const doc: theia.TextDocument | undefined = await theia.workspace.openTextDocument(openPath);
            if (doc) {
                theia.window.showTextDocument(doc);
            }
        }
    }
}

export async function addPanel(context: theia.PluginContext): Promise<void> {
    // Open Welcome tab
    const currentPanel = theia.window.createWebviewPanel(welcomePageViewType, che.product.name, { viewColumn: theia.ViewColumn.One, preserveFocus: false }, {
        // Enable javascript in the webview
        enableScripts: true,

        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
            theia.Uri.file(path.join(context.extensionPath, 'resources')),
            theia.Uri.file(path.join(context.extensionPath, 'node_modules/@fortawesome'))
        ]
    });

    currentPanel.webview.html = await getHtmlForWebview(context);

    // Handle messages from the webview
    currentPanel.webview.onDidReceiveMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (message: any) => {
            switch (message.command) {
                case 'alert':
                    theia.window.showErrorMessage(message.text);
                    return;
                case 'executeCommand':
                    theia.commands.executeCommand(message.commandName);
                    return;
            }
        },
        undefined,
        context.subscriptions
    );

    currentPanel.iconPath = theia.Uri.parse(che.product.icon);
}

export function start(context: theia.PluginContext): void {
    let showWelcomePage: boolean | undefined = true;

    theia.window.registerWebviewPanelSerializer(welcomePageViewType, new WelcomePageSerializer(context));

    const configuration = theia.workspace.getConfiguration(Settings.CHE_CONFIGURATION);
    if (configuration) {
        showWelcomePage = configuration.get(Settings.SHOW_WELCOME_PAGE);
    }

    if (showWelcomePage && theia.window.visibleTextEditors.length === 0) {
        setTimeout(async () => {
            addPanel(context);
            handleReadmeFiles();
        }, 100);
    }
}

export function stop(): void {
}

export class WelcomePageSerializer implements theia.WebviewPanelSerializer {

    constructor(readonly context: theia.PluginContext) {
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async deserializeWebviewPanel(webviewPanel: theia.WebviewPanel, state: any): Promise<void> {
        webviewPanel.webview.html = await getHtmlForWebview(this.context);
    }
}
