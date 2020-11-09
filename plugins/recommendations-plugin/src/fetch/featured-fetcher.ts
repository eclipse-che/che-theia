/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as theia from '@theia/plugin';

import { inject, injectable } from 'inversify';

import AxiosInstance from 'axios';
import { ChePluginRegistry } from '../registry/che-plugin-registry';
import { FeaturedPlugin } from './featured-plugin';

@injectable()
export class FeaturedFetcher {
  @inject(ChePluginRegistry)
  private chePluginRegistry: ChePluginRegistry;

  async fetch(): Promise<FeaturedPlugin[]> {
    const pluginRegistryUrl = await this.chePluginRegistry.getUrl();

    let featuredList: FeaturedPlugin[] = [];
    // need to fetch
    try {
      const response = await AxiosInstance.get(`${pluginRegistryUrl}/che-theia/featured.json`);
      featuredList = response.data.featured;
    } catch (error) {
      featuredList = [];
      theia.window.showInformationMessage(`Error while fetching featured recommendation ${error}`);
    }
    return featuredList;
  }
}
