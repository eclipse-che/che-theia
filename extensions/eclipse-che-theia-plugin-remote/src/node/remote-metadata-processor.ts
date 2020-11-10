/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { MetadataProcessor, PluginMetadata, getPluginId } from '@theia/plugin-ext';
import { inject, injectable } from 'inversify';

import { HostedPluginMapping } from './plugin-remote-mapping';
import { ILogger } from '@theia/core/lib/common';

/**
 * Add on top of metadata the endpoint host
 * @author Florent Benoit
 */
@injectable()
export class RemoteMetadataProcessor implements MetadataProcessor {
  @inject(ILogger)
  protected readonly logger: ILogger;

  @inject(HostedPluginMapping)
  protected hostedPluginMapping: HostedPluginMapping;

  process(pluginMetadata: PluginMetadata): void {
    const pluginID = getPluginId(pluginMetadata.model);
    if (this.hostedPluginMapping.hasEndpoint(pluginID)) {
      pluginMetadata.host = this.hostedPluginMapping.getEndpoint(pluginID)!.replace(/\W/g, '_');
    }
  }
}
