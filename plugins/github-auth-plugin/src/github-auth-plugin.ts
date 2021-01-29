/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { v4 } from 'uuid';

export async function start(context: theia.PluginContext): Promise<void> {
  const sessions: theia.AuthenticationSession[] = context.workspaceState.get('sessions') || [];
  const onDidChangeSessions = new theia.EventEmitter<theia.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  theia.authentication.registerAuthenticationProvider({
    id: 'github',
    label: 'GitHub',
    supportsMultipleAccounts: false,
    onDidChangeSessions: onDidChangeSessions.event,
    getSessions: async () => sessions,
    login: async (scopes: string[]) => {
      if (!(await che.oAuth.isRegistered('github'))) {
        if (
          await theia.window.showWarningMessage(
            'Che could not authenticate to your Github account. The setup for Github OAuth provider is not complete.',
            'Setup instructions'
          )
        ) {
          theia.commands.executeCommand(
            'theia.open',
            'https://www.eclipse.org/che/docs/che-7/administration-guide/configuring-authorization/#configuring-github-oauth_che'
          );
        }
        return;
      }
      const githubUser = await che.github.getUser();
      const session = {
        id: v4(),
        accessToken: await che.github.getToken(),
        account: { label: githubUser.login, id: githubUser.id.toString() },
        scopes,
      };
      const sessionIndex = sessions.findIndex(s => s.id === session.id);
      if (sessionIndex > -1) {
        sessions.splice(sessionIndex, 1, session);
      } else {
        sessions.push(session);
      }
      context.workspaceState.update('sessions', sessions);
      onDidChangeSessions.fire({ added: [session.id], removed: [], changed: [] });
      return session;
    },
    logout: async (id: string) => {
      const sessionIndex = sessions.findIndex(session => session.id === id);
      if (sessionIndex > -1) {
        sessions.splice(sessionIndex, 1);
        context.workspaceState.update('sessions', sessions);
        onDidChangeSessions.fire({ added: [], removed: [id], changed: [] });
      }
    },
  });
}

export function stop(): void {}
