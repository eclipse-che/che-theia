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
import * as che from '@eclipse-che/plugin';

export function start(context: theia.PluginContext) {
    che.telemetry.event('WORKSPACE_OPENED', context.extensionPath, [
    ]);

    theia.workspace.onDidChangeTextDocument((e: theia.TextDocumentChangeEvent) => {
        che.telemetry.event('EDITOR_USED', context.extensionPath,
            [
                ['programming language', e.document.languageId]
            ]);
    });

    che.telemetry.onWillExecuteCommand(async event => {
        console.log(' ===========================> ' + event.commandId);
    });

    let gitLogHandlerInitialized: boolean;
    /* Git log handler, listens to Git commands and pushes telemetry events. */
    const onChange = () => {
        // Get the vscode Git plugin if the plugin is started.
        const gitExtension = theia.plugins.getPlugin('vscode.git');
        if (!gitLogHandlerInitialized && gitExtension && gitExtension.exports) {
            // Set the initialized flag to true state, to not to initialize the handler again on plugin change event.
            gitLogHandlerInitialized = true;
            // tslint:disable-next-line:no-any
            const git: any = gitExtension.exports._model.git;
            let command: string;
            const listener = async (out: string) => {
                // Parse Git log events.
                const split = out.split(' ');
                if (out.startsWith('> git commit') || out.startsWith('> git push')) {
                    command = split[2];
                    switch (command) {
                        case 'commit': {
                            che.telemetry.event('COMMIT_LOCALLY', context.extensionPath, []);
                            break;
                        }
                        case 'push': {
                            che.telemetry.event('PUSH_TO_REMOTE', context.extensionPath, []);
                            break;
                        }
                    }
                }
            };
            // Set the git log listener.
            git.onOutput.addListener('log', listener);
        }
    };

    theia.plugins.onDidChange(onChange);
}

export function stop() {

}
