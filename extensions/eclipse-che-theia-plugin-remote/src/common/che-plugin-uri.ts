/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import URI from '@theia/core/lib/common/uri';

/**
 * Share the definition of plugin resource uris between back end and
 * front end.
 */
export namespace ChePluginUri {
  export const SCHEME = 'chepluginresource';

  export function createUri(pluginId: string, relativePath?: string): URI {
    return new URI(
      `${SCHEME}:///hostedPlugin/${pluginId}/${
        relativePath ? encodeURIComponent(relativePath.normalize().toString()) : ''
      }`
    );
  }
}
