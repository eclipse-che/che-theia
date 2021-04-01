/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { VSCodeExtensionEntryWithSidecar } from '../api/vscode-extension-entry';
import { injectable } from 'inversify';

/**
 * Reduce the given array of extensions by merging the extensions sharing the same image
 * For example vscode-java and vscode-java-test have java:latest image, at the end we have an entry with two extensions (java + tests) in a single image (java:latest)
 */

@injectable()
export class CheTheiaPluginSidecarMerger {
  merge(extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[]): VSCodeExtensionEntryWithSidecar[] {
    // need to merge sidecar if they have the same image
    // get unique name of images
    const uniqueImages = [...new Set(extensionsWithSidecars.map(extension => extension.sidecar.image))];

    return uniqueImages.map(imageName => {
      // get all entires for this image
      const matchingExtensions = extensionsWithSidecars.filter(extension => extension.sidecar.image === imageName);

      // take sidecar information
      const sidecar = matchingExtensions[0].sidecar;
      const sidecarName = matchingExtensions[0].sidecarName;

      const vsixExtensions = matchingExtensions
        .map(extension => extension.extensions)
        // flatten the array of array
        .reduce((acc, val) => acc.concat(val), []);

      const allPreferences = matchingExtensions
        .map(extension => extension.preferences || {})
        .reduce((acc, val) => acc.concat(val), []);

      // merge preferences
      const preferences = Object.assign({}, ...allPreferences);

      const dependencies = matchingExtensions
        .map(extension => extension.dependencies || [])
        .reduce((acc, val) => acc.concat(val), []);

      return {
        id: `merged-${imageName}`,
        resolved: true,
        optional: false,
        preferences,
        dependencies,
        sidecarName,
        sidecar,
        extensions: vsixExtensions,
      };
    });
  }
}
