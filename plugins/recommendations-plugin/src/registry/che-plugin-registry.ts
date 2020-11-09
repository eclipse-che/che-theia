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

/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { injectable } from 'inversify';

/**
 * Grab the Che Plugin Registry URL
 */
@injectable()
export class ChePluginRegistry {
  private pluginRegistryUrl: String;

  async getUrl(): Promise<String> {
    if (!this.pluginRegistryUrl) {
      const settings = await che.workspace.getSettings();
      this.pluginRegistryUrl =
        settings['cheWorkspacePluginRegistryInternalUrl'] || settings['cheWorkspacePluginRegistryUrl'];
    }
    return this.pluginRegistryUrl;
  }
}
