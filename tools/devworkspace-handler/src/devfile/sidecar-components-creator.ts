/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { ContainerPluginRemoteUpdater } from './container-plugin-remote-updater';
import { V1alpha2DevWorkspaceSpecTemplateComponents } from '@devfile/api';
import { VSCodeExtensionEntryWithSidecar } from '../api/vscode-extension-entry';

/**
 * Generate spec template components for every sidecar of plug-ins
 */
@injectable()
export class SidecarComponentsCreator {
  @inject(ContainerPluginRemoteUpdater)
  private containerPluginRemoteUpdater: ContainerPluginRemoteUpdater;

  async create(
    extensionsWithSidecars: VSCodeExtensionEntryWithSidecar[]
  ): Promise<V1alpha2DevWorkspaceSpecTemplateComponents[]> {
    // ok now add sidecar components
    return extensionsWithSidecars.map(entry => {
      const sidecarName = entry.sidecarName || `sidecar-${entry.id.replace(/[^\w\s]/gi, '-')}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attributes: { [key: string]: any } = {
        'app.kubernetes.io/part-of': 'che-theia.eclipse.org',
        'app.kubernetes.io/component': 'vscode-extension',
        'che-theia.eclipse.org/vscode-extensions': entry.extensions,
      };

      // add preferences only if there are one
      if (entry.preferences && Object.keys(entry.preferences).length > 0) {
        attributes['che-theia.eclipse.org/vscode-preferences'] = entry.preferences;
      }

      const component = {
        name: sidecarName,
        attributes,
        container: entry.sidecar,
      };

      // add extra stuff
      this.containerPluginRemoteUpdater.update(sidecarName, component.container);
      return component as V1alpha2DevWorkspaceSpecTemplateComponents;
    });
  }
}
