/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { PluginPackage, getPluginId } from '@theia/plugin-ext/lib/common/plugin-protocol';

import { ChePluginUri } from '../common/che-plugin-uri';
import { PluginUriFactory } from '@theia/plugin-ext/lib/hosted/node/scanners/plugin-uri-factory';
import URI from '@theia/core/lib/common/uri';
import { injectable } from 'inversify';

/**
 * Creates plugin resource URIs for plugin-relative files.
 */
@injectable()
export class ChePluginUriFactory implements PluginUriFactory {
  createUri(pkg: PluginPackage, pkgRelativePath?: string): URI {
    return ChePluginUri.createUri(getPluginId(pkg), pkgRelativePath);
  }
}
