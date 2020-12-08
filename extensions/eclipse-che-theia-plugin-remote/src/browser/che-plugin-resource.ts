/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { MaybePromise, Resource, ResourceReadOptions, ResourceResolver } from '@theia/core/lib/common';

import { ChePluginUri } from '../common/che-plugin-uri';
import { Endpoint } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { injectable } from 'inversify';

/**
 * A resource for loading plugin resources. Uris will be of the form
 * pluginresource://<plugin id>/path/relative/to/plugin/location
 * The path is resolve relative to the directory designated by the
 * plugins package path.
 */
export class ChePluginResource implements Resource {
  readonly uri: URI;

  constructor(pluginId: string, relativePath: string) {
    this.uri = ChePluginResource.getUri(pluginId, relativePath);
  }

  private static getUri(pluginId: string, relativePath: string): URI {
    return new Endpoint({
      path: `hostedPlugin/${pluginId}/${encodeURIComponent(relativePath.normalize().toString())}`,
    }).getRestUrl();
  }

  async readContents(options?: ResourceReadOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.onreadystatechange = function (): void {
        if (this.readyState === XMLHttpRequest.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('Could not fetch plugin resource'));
          }
        }
      };

      request.open('GET', this.uri.toString(), true);
      request.send();
    });
  }

  dispose(): void {}
}

@injectable()
export class ChePluginResourceResolver implements ResourceResolver {
  resolve(uri: URI): MaybePromise<Resource> {
    if (uri.scheme !== ChePluginUri.SCHEME) {
      throw new Error('Not a plugin resource: ' + uri.toString());
    }
    return new ChePluginResource(uri.authority, uri.path.toString().substring(1));
  }
}
