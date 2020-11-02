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

export async function start(context: theia.PluginContext): Promise<void> {
    if (theia.plugins.getPlugin('github.vscode-pull-request-github')) {
        let session: theia.AuthenticationSession | undefined = context.workspaceState.get('session');
        const onDidChangeSessions = new theia.EventEmitter<theia.AuthenticationProviderAuthenticationSessionsChangeEvent>();
        theia.authentication.registerAuthenticationProvider({
                id: 'github',
                label: 'GitHub',
                supportsMultipleAccounts: false,
                onDidChangeSessions: onDidChangeSessions.event,
                getSessions: async () => {
                    if (session) {
                        return [session];
                    } else {
                        return [];
                    }
                },
                login: async (scopes: string[]) => {
                    const githubUser = await che.github.getUser();
                    session = {
                        id: 'github-session',
                        accessToken: await che.github.getToken(),
                        account: {label: githubUser.login, id: githubUser.id.toString()},
                        scopes
                    };
                    context.workspaceState.update('session', session);
                    onDidChangeSessions.fire({ added: [session.id], removed: [], changed: [] });
                    return session;
                },
                logout: async (id: string) => {
                    session = undefined;
                    context.workspaceState.update('session', session);
                    onDidChangeSessions.fire({ added: [], removed: [id], changed: [] });
                }
            }
        );
        if (session) {
            onDidChangeSessions.fire({ added: [session.id], removed: [], changed: [] });
        // TODO Remove the notification when https://github.com/eclipse-theia/theia/issues/7178 is fixed.
        } else {
            const signIn = 'Sign in';
            const result = await theia.window.showInformationMessage(
                'In order to use the Pull Requests functionality, you must sign in to GitHub',
                signIn);

            if (result === signIn) {
                theia.authentication.getSession('github', ['read:user', 'user:email', 'repo'], { createIfNone: true });
            }
        }
    }
}

export function stop(): void {

}
