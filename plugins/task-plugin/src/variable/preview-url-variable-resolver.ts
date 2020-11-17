/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as startPoint from '../task-plugin-backend';

import { inject, injectable } from 'inversify';

import { CheWorkspaceClient } from '../che-workspace-client';

/** Prefix which allows to recognize preview URL links among workspace links */
const PREVIEW_URL_PREFIX = 'previewurl';

/**
 * Contributes the substitution variables, in form of `previewurl.<unique_string>`,
 * which are resolved to the URL using workspace links.
 */
@injectable()
export class PreviewUrlVariableResolver {
  @inject(CheWorkspaceClient)
  protected readonly cheWorkspaceClient!: CheWorkspaceClient;

  /** Extracts preview URL links for current workspace and register them as variables. */
  async registerVariables(): Promise<void> {
    const links = await this.cheWorkspaceClient.getLinks();
    if (!links) {
      return;
    }

    for (const link in links) {
      if (!links.hasOwnProperty(link) || !link.startsWith(PREVIEW_URL_PREFIX)) {
        continue;
      }

      const url = links[link];
      if (url) {
        const variableSubscription = await che.variables.registerVariable(this.createVariable(link, url));
        startPoint.getSubscriptions().push(variableSubscription);
      }
    }
  }

  private createVariable(variable: string, url: string): che.Variable {
    return {
      name: `${variable}`,
      description: url,
      resolve: async () => url,
      isResolved: true,
    };
  }
}
