/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { V1alpha2DevWorkspaceTemplate, V1alpha2DevWorkspaceTemplateSpec } from '@devfile/api';

import { DevfileContext } from '../api/devfile-context';
import { injectable } from 'inversify';

/* eslint-disable max-len */

/**
 * Manage the registration of the vsix installer component by adding a new devWorkspace template
 * it will be added as a new DevWorkspaceTemplate
 */
@injectable()
export class VsixInstallerComponentUpdater {
  static readonly TEMPLATE_CONTENT: V1alpha2DevWorkspaceTemplateSpec = {
    components: [
      {
        name: 'vsix-installer',
        attributes: {
          'app.kubernetes.io/part-of': 'che-theia.eclipse.org',
          'app.kubernetes.io/component': 'vsix-installer',
        },
        container: {
          image: 'quay.io/eclipse/che-theia-vsix-installer:next',
          volumeMounts: [
            {
              path: '/plugins',
              name: 'plugins',
            },
          ],
        },
      },
    ],
    events: {
      preStart: ['copy-vsix'],
    },
    commands: [
      {
        id: 'copy-vsix',
        apply: {
          component: 'vsix-installer',
        },
      },
    ],
  };

  async add(devfileContext: DevfileContext): Promise<void> {
    // pre-requisites: to have existing components in devWorkspace
    if (!devfileContext.devWorkspace.spec?.template?.components) {
      throw new Error('No components in the devworkspace templates');
    }

    // append the suffix
    const name = `che-theia-vsix-installer-${devfileContext.suffix}`;

    // create a new DevWorkspaceTemplate
    const vsixInstallerDevWorkspaceTemplate: V1alpha2DevWorkspaceTemplate = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspaceTemplate',
      metadata: {
        name,
      },
      spec: VsixInstallerComponentUpdater.TEMPLATE_CONTENT,
    };
    // add the template
    devfileContext.devWorkspaceTemplates.push(vsixInstallerDevWorkspaceTemplate);
  }
}
