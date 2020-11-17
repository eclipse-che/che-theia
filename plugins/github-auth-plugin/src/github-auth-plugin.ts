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
  if (theia.plugins.getPlugin('github.vscode-pull-request-github')) {
    if (sessions.length > 0) {
      onDidChangeSessions.fire({ added: sessions.map(s => s.id), removed: [], changed: [] });
      // TODO Remove the notification when https://github.com/eclipse-theia/theia/issues/7178 is fixed.
    } else {
      const signIn = 'Sign in';
      const result = await theia.window.showInformationMessage(
        'In order to use the Pull Requests functionality, you must sign in to GitHub',
        signIn
      );

      if (result === signIn) {
        theia.authentication.getSession('github', ['read:user', 'user:email', 'repo'], { createIfNone: true });
      }
    }
  }
}

export function stop(): void {}
