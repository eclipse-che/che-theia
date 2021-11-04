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
  public static readonly DEV_CONTAINER_ATTRIBUTE = 'che-theia.eclipse.org/dev-container';

  async find(devfileContext: DevfileContext): Promise<V1alpha2DevWorkspaceSpecTemplateComponents> {
    // need to find definition

    // first search if we have an optional annotated container
    const annotatedContainers = devfileContext.devWorkspace.spec?.template?.components?.filter(
      component =>
        component.attributes &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component.attributes as any)[DevContainerComponentFinder.DEV_CONTAINER_ATTRIBUTE] === true
    );
    if (annotatedContainers) {
      if (annotatedContainers.length === 1) {
        return annotatedContainers[0];
      } else if (annotatedContainers.length > 1) {
        throw new Error(
          `Only one container can be annotated with ${DevContainerComponentFinder.DEV_CONTAINER_ATTRIBUTE}: true`
        );
      }
    }

    // search in main devWorkspace (exclude theia as component name)
    const devComponents = devfileContext.devWorkspace.spec?.template?.components
      ?.filter(component => component.container && component.name !== 'theia-ide')
      .filter(
        // we should ignore component that do not mount the sources
        component => component.container && component.container.mountSources !== false
      );

    // only one, fine, else error
    if (!devComponents || devComponents.length === 0) {
      throw new Error('Not able to find any dev container component in DevWorkspace');
    } else if (devComponents.length === 1) {
      return devComponents[0];
    } else {
      console.warn(
        `More than one dev container component has been potentially found, taking the first one of ${devComponents.map(
          component => component.name
        )}`
      );
      return devComponents[0];
    }
  }
}
