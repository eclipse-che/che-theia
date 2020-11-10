/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ChePluginMetadata } from '../che-plugin-protocol';

export namespace PluginFilter {
  // @installed
  // @builtin
  // @enabled
  // @disabled
  export function hasType(filter: string, type: string): boolean {
    if (filter) {
      const filters = filter.split(' ');
      const found = filters.find(value => value === type);
      return found !== undefined;
    }

    return false;
  }

  export function filterByText(plugins: ChePluginMetadata[], text: string): ChePluginMetadata[] {
    // return plugins;
    return plugins.filter(plugin => {
      if (plugin.publisher && plugin.publisher.toLowerCase().indexOf(text.toLowerCase()) >= 0) {
        return true;
      }

      if (plugin.name && plugin.name.toLowerCase().indexOf(text.toLowerCase()) >= 0) {
        return true;
      }

      if (plugin.description && plugin.description.toLowerCase().indexOf(text.toLowerCase()) >= 0) {
        return true;
      }

      return false;
    });
  }

  export function filterPlugins(plugins: ChePluginMetadata[], filter: string): ChePluginMetadata[] {
    let filteredPlugins = plugins;
    const filters = filter.split(' ');

    filters.forEach(f => {
      if (f) {
        if (!f.startsWith('@')) {
          filteredPlugins = PluginFilter.filterByText(filteredPlugins, f);
        }
      }
    });

    return filteredPlugins;
  }
}
