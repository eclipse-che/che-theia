/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DeployedPlugin } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { HostedPluginServerImpl } from '@theia/plugin-ext/lib/hosted/node/plugin-service';
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class CheHostedPluginServerImpl extends HostedPluginServerImpl {
  protected async localizePlugin(plugin: DeployedPlugin, locale: string): Promise<DeployedPlugin> {
    // che-theia doesn't support localization for plugins
    return plugin;
  }
}
