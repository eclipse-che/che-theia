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

    che.telemetry.addCommandListener('core.about', () => {
        console.log('==================================================== >>>>> ABOUT');
    });

    che.telemetry.addCommandListener('git.commit', () => {
        console.log('==================================================== >>>>> COMMIT');
        che.telemetry.event('COMMIT_LOCALLY', context.extensionPath, []);
    });

    che.telemetry.addCommandListener('git.push', () => {
        console.log('==================================================== >>>>> PUSH');
        che.telemetry.event('PUSH_TO_REMOTE', context.extensionPath, []);
    });

    theia.workspace.onDidChangeTextDocument((e: theia.TextDocumentChangeEvent) => {
        che.telemetry.event('EDITOR_USED', context.extensionPath,
            [
                ['programming language', e.document.languageId]
            ]);
    });
}

export function stop() {

}
