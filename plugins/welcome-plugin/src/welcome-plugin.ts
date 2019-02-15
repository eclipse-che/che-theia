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

async function getHtmlForWebview(context: theia.PluginContext): Promise<string> {

    // Local path to main script run in the webview
    const scriptPathOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'welcome-page.js'));
    // And the uri we use to load this script in the webview
    const scriptUri = scriptPathOnDisk.with({ scheme: 'theia-resource' });

    // Local path to main script run in the webview
    const cssPathOnDisk = theia.Uri.file(path.join(context.extensionPath, 'resources', 'welcome-page.css'));
    // And the uri we use to load this script in the webview
    const cssUri = cssPathOnDisk.with({ scheme: 'theia-resource' });

    const welcomePage = new WelcomePage(context);
    const rendering = await welcomePage.render(context);
    // tslint:disable: max-line-length
    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; script-src 'unsafe-inline' 'self' ;">
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

export async function doStart(context: theia.PluginContext): Promise<void> {
    addPanel(context);
    handleReadmeFiles(context);
}

// Open Readme file is there is one
export async function handleReadmeFiles(context: theia.PluginContext): Promise<void> {

    const roots: theia.WorkspaceFolder[] | undefined = await theia.workspace.workspaceFolders;
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

    // Otherwise, create a new panel
    const currentPanel = theia.window.createWebviewPanel('WelcomePage', 'Welcome', { viewColumn: theia.ViewColumn.One, preserveFocus: false }, {
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
        // tslint:disable-next-line: no-any
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

    // Local icon paths in the webview
    const iconUri = theia.Uri.file(path.join(context.extensionPath, 'resources', 'che-logo.png'));
    currentPanel.iconPath = iconUri;

}

export function start(context: theia.PluginContext): void {
    setTimeout(async () => doStart(context), 1000);
}

export function stop() {

}
