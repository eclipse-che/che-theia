/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { injectable, postConstruct } from 'inversify';

import { Deferred } from '../util/deferred';

/**
 * Grab the Che Plugin Registry URL
 */
@injectable()
export class ChePluginRegistry {
  private pluginRegistryUrl: String;

  private internalService: boolean;

  private initDone: Deferred<unknown>;

  constructor() {
    this.initDone = new Deferred();
  }

  @postConstruct()
  async init(): Promise<void> {
    const settings = await che.workspace.getSettings();
    const internalUrl = settings['cheWorkspacePluginRegistryInternalUrl'];
    const externalUrl = settings['cheWorkspacePluginRegistryUrl'];

    // internal service URL is not empty but set to external one if UseInternalClusterSVCNames is not set...
    this.internalService = !!internalUrl && internalUrl !== externalUrl;

    // if one day internal is not set or empty, default to external
    this.pluginRegistryUrl = internalUrl || externalUrl;
    this.initDone.resolve();
  }

  async getUrl(): Promise<String> {
    await this.initDone.promise;
    return this.pluginRegistryUrl;
  }

  async isInternalService(): Promise<boolean> {
    await this.initDone.promise;
    return this.internalService;
  }
}
