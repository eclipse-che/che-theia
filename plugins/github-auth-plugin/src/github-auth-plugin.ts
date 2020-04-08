/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';

export function start(context: theia.PluginContext): void {
    if (theia.plugins.getPlugin('github.vscode-pull-request-github')) {
        const command = {
            id: 'github-plugin-authenticate',
            label: 'GitHub authenticate'
        };
        context.subscriptions.push(theia.commands.registerCommand(command, async () => {
            const token = await che.github.getToken();
            const conf = theia.workspace.getConfiguration();
            await conf.update('githubPullRequests.hosts', [{
                host: 'github.com',
                token
            }], theia.ConfigurationTarget.Global);
            theia.window.showWarningMessage('GitHub token has been set to preferences. ' +
                'Refresh the page to reinitialise the vscode GitHub pull-request plugin with the token');
        }));
    }
}

export function stop(): void {

}
