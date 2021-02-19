/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

const SSH_PLUGIN_ID = 'Eclipse Che.@eclipse-che/theia-ssh-plugin';

export async function addKeyToGitHub(): Promise<void> {
  const sshPlugin = theia.plugins.getPlugin(SSH_PLUGIN_ID);
  if (sshPlugin && sshPlugin.exports) {
    await sshPlugin.exports.addKeyToGitHub();
  } else {
    await theia.window.showErrorMessage('Unable to find SSH Plugin');
  }
}

export async function configure(gitHubActions: boolean): Promise<void> {
  const sshPlugin = theia.plugins.getPlugin(SSH_PLUGIN_ID);
  if (sshPlugin && sshPlugin.exports) {
    await sshPlugin.exports.configureSSH(gitHubActions);
  } else {
    await theia.window.showErrorMessage('Unable to find SSH Plugin');
  }
}
