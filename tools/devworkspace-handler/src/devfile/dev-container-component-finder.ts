/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DevfileContext } from '../api/devfile-context';
import { V1alpha2DevWorkspaceSpecTemplateComponents } from '@devfile/api';
import { injectable } from 'inversify';

/**
 * Need to find dev container from main dev workspace or from a template
 */
@injectable()
export class DevContainerComponentFinder {
  async find(devfileContext: DevfileContext): Promise<V1alpha2DevWorkspaceSpecTemplateComponents> {
    // need to find definition

    // search in main devWorkspace (exclude theia as component name)
    const devComponents = devfileContext.devWorkspace.spec?.template?.components?.filter(
      component => component.container && component.name !== 'theia-ide'
    );
    // only one, fine, else error
    if (!devComponents || devComponents.length === 0) {
      throw new Error('Not able to find any dev container component in DevWorkspace');
    } else if (devComponents.length === 1) {
      return devComponents[0];
    } else {
      throw new Error(
        `Too many components have been found that could be considered as dev container. There should be only one to merge sidecars. Found component names: ${devComponents.map(
          component => component.name
        )}`
      );
    }
  }
}
