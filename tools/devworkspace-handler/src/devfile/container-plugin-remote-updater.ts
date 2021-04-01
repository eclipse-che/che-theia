/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer } from '@devfile/api';
import { injectable } from 'inversify';

@injectable()
export class ContainerPluginRemoteUpdater {
  update(componentName: string, container: V1alpha2DevWorkspaceSpecTemplateComponentsItemsContainer): void {
    let env = container.env;
    if (!env) {
      env = [];
      container.env = env;
    }
    env.push({
      name: 'PLUGIN_REMOTE_ENDPOINT_EXECUTABLE',
      value: '/remote-endpoint/plugin-remote-endpoint',
    });
    env.push({
      name: 'THEIA_PLUGINS',
      value: `local-dir:///plugins/sidecars/${componentName}`,
    });

    // next, the volumes
    let volumeMounts = container.volumeMounts;
    if (!volumeMounts) {
      volumeMounts = [];
      container.volumeMounts = volumeMounts;
    }
    volumeMounts.push({
      path: '/remote-endpoint',
      name: 'remote-endpoint',
    });
    volumeMounts.push({
      path: '/plugins',
      name: 'plugins',
    });
  }
}
