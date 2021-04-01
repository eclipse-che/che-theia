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
 * Need to find che theia component from main dev workspace or from a template
 */
@injectable()
export class CheTheiaComponentFinder {
  async find(devfileContext: DevfileContext): Promise<V1alpha2DevWorkspaceSpecTemplateComponents> {
    // need to find definition

    // first, search in all templates
    for (const template of devfileContext.devWorkspaceTemplates) {
      const theiaComponent = template.spec?.components?.find(component => component.name === 'theia-ide');
      // got one
      if (theiaComponent) {
        return theiaComponent;
      }
    }

    // then search in main devWorkspace
    const theiaComponent = devfileContext.devWorkspace.spec?.template?.components?.find(
      component => component.name === 'theia-ide'
    );
    // got one
    if (theiaComponent) {
      return theiaComponent;
    }

    throw new Error('Not able to find theia-ide component in DevWorkspace and its templates');
  }
}
