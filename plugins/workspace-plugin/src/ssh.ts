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

async function err(): Promise<void> {
  await theia.window.showErrorMessage('Unable to find SSH Plugin');
}

export async function generateAndUploadKey(): Promise<boolean> {
  const sshPlugin = theia.plugins.getPlugin(SSH_PLUGIN_ID);
  if (sshPlugin && sshPlugin.exports) {
    const result = await sshPlugin.exports.uploadGitHubKey();
    return result;
  } else {
    await err();
  }

  return false;
}

export async function showCertificates(): Promise<void> {
  const sshPlugin = theia.plugins.getPlugin(SSH_PLUGIN_ID);
  if (sshPlugin && sshPlugin.exports) {
    await sshPlugin.exports.viewPublicKey();
  } else {
    await err();
  }
}

export async function uploadCertificate(): Promise<void> {
  const sshPlugin = theia.plugins.getPlugin(SSH_PLUGIN_ID);
  if (sshPlugin && sshPlugin.exports) {
    await sshPlugin.exports.uploadPrivateKey();
  } else {
    await err();
  }
}
