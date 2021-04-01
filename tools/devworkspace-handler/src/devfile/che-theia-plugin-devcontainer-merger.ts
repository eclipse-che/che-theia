/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { VSCodeExtensionDevContainer } from './vscode-extension-dev-container';
import { VSCodeExtensionEntryWithSidecar } from '../api/vscode-extension-entry';
import { injectable } from 'inversify';

/**
 * When extensions will run in the dev container, need to aggregate all settings of all extensions like extensions, preferences, volume mounts and endpoints
 */
@injectable()
export class CheTheiaPluginDevContainerMerger {
  merge(extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[]): VSCodeExtensionDevContainer {
    const extensions = [
      ...new Set(
        extensionsWithSidecars
          .map(extension => extension.extensions)
          // flatten the array of array
          .reduce((acc, val) => acc.concat(val), [])
      ),
    ];

    // merge preferences
    const allPreferences = extensionsWithSidecars
      .map(extension => extension.preferences || {})
      .reduce((acc, val) => acc.concat(val), []);
    const preferences = Object.assign({}, ...allPreferences);

    // all volume mounts
    const volumeMounts = extensionsWithSidecars
      .map(extension => extension.sidecar.volumeMounts || [])
      .reduce((acc, val) => acc.concat(val), []);

    // all endpoints
    const endpoints = extensionsWithSidecars
      .map(extension => extension.sidecar.endpoints || [])
      .reduce((acc, val) => acc.concat(val), []);

    return {
      extensions,
      preferences,
      volumeMounts,
      endpoints,
    };
  }
}
