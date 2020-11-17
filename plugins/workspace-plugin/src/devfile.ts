/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

const CREATE_WORKSPACE_COMMAND = {
  id: 'workspace-plugin.create-workspace',
  label: 'Create Workspace',
  tooltip: 'Create workspace from this DevFile',
};

export class Devfile {
  constructor(private context: theia.PluginContext) {}

  init(): void {
    this.context.subscriptions.push(
      theia.commands.registerCommand(CREATE_WORKSPACE_COMMAND, uri => this.createWorkspace(uri))
    );
  }

  async createWorkspace(uri: theia.Uri): Promise<void> {
    if ('file' !== uri.scheme) {
      return;
    }

    try {
      await che.devfile.createWorkspace(uri.toString());
    } catch (error) {
      console.log(error);
      theia.window.showErrorMessage(error.message);
    }
  }
}
