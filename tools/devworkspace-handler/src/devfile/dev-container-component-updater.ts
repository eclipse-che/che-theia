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
import { DevContainerComponentFinder } from './dev-container-component-finder';
import { DevfileContext } from '../api/devfile-context';
import { VSCodeExtensionDevContainer } from './vscode-extension-dev-container';

/**
 * Apply to the DevWorkspace component the information specified in a given DevContainer struct like preferences/extensions/endpoints, etc.
 */
@injectable()
export class DevContainerComponentUpdater {
  @inject(DevContainerComponentFinder)
  private devContainerComponentFinder: DevContainerComponentFinder;

  @inject(ContainerPluginRemoteUpdater)
  private containerPluginRemoteUpdater: ContainerPluginRemoteUpdater;

  async insert(
    devfileContext: DevfileContext,
    vSCodeExtensionDevContainer: VSCodeExtensionDevContainer
  ): Promise<void> {
    const devContainerComponent = await this.devContainerComponentFinder.find(devfileContext);

    const devContainer = devContainerComponent.container;
    if (!devContainer) {
      throw new Error('The dev container should be a component with type "container".');
    }

    // add attributes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attributes: any = devContainerComponent.attributes;
    if (!attributes) {
      attributes = {};
      devContainerComponent.attributes = attributes;
    }

    // extensions
    attributes['che-theia.eclipse.org/vscode-extensions'] = vSCodeExtensionDevContainer.extensions;

    // add preferences only if there are one
    if (vSCodeExtensionDevContainer.preferences && Object.keys(vSCodeExtensionDevContainer.preferences).length > 0) {
      attributes['che-theia.eclipse.org/vscode-preferences'] = vSCodeExtensionDevContainer.preferences;
    }

    attributes['app.kubernetes.io/name'] = devContainerComponent.name;
    // no endpoints ? initialize empty array
    if (!devContainer.endpoints) {
      devContainer.endpoints = [];
    }
    const toInsertEndpoints = vSCodeExtensionDevContainer.endpoints || [];
    devContainer.endpoints.push(...toInsertEndpoints);

    // no env ? initialize empty array
    if (!devContainer.env) {
      devContainer.env = [];
    }
    const toInsertEnvs = vSCodeExtensionDevContainer.env || [];
    devContainer.env.push(...toInsertEnvs);

    // no volumeMounts ? initialize empty array
    const devContainerVolumes = devContainer.volumeMounts || [];
    devContainer.volumeMounts = devContainerVolumes;

    // pick up only volumes that are not already defined
    const toInsertVolumeMounts = (vSCodeExtensionDevContainer.volumeMounts || []).filter(
      volume => !devContainerVolumes.some(containerVolume => containerVolume.name === volume.name)
    );
    devContainer.volumeMounts.push(...toInsertVolumeMounts);

    // need to tweak the entrypoint to call the ${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}
    devContainer.args = ['sh', '-c', '${PLUGIN_REMOTE_ENDPOINT_EXECUTABLE}'];

    // now, need to add the common stuff
    this.containerPluginRemoteUpdater.update(devContainerComponent.name, devContainer);

    if (devContainer.endpoints.length === 0) {
      delete devContainer.endpoints;
    }

    if (devContainer.volumeMounts.length === 0) {
      delete devContainer.volumeMounts;
    }
  }
}
