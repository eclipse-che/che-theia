/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

/**
 * Make checks on workspace ephemeral configuration and shows dedicated information to user.
 */
export class EphemeralWorkspaceChecker {
  constructor() {}

  public async check(): Promise<void> {
    const devfile = await che.devfile.get();
    const isEphemeralWorkspace = devfile.metadata?.attributes && devfile.metadata.attributes.persistVolumes === 'false';
    if (isEphemeralWorkspace) {
      this.displayEphemeralWarning();
    }
  }

  /**
   * Displays warning in status bar, that workspace is ephemeral.
   */
  private displayEphemeralWarning(): void {
    const item = theia.window.createStatusBarItem(theia.StatusBarAlignment.Left);
    item.text = '$(exclamation-triangle) Ephemeral Mode';
    item.tooltip =
      'All changes to the source code will be lost when the workspace is stopped unless they are pushed to a source code repository.';
    item.color = '#fcc13d';
    item.show();
  }
}
