/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
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

/**
 * Contributes the substitution variables, in form of `server.<name>`,
 * which are resolved to the URL of the server of Che machines.
 */
@injectable()
export class ServerVariableResolver {
  @inject(CheWorkspaceClient)
  protected readonly cheWorkspaceClient!: CheWorkspaceClient;

  async registerVariables(): Promise<void> {
    const componentStatuses = await this.cheWorkspaceClient.getComponentStatuses();
    await Promise.all(
      componentStatuses.map(async componentStatus => {
        if (componentStatus.endpoints) {
          for (const endpointName in componentStatus.endpoints) {
            if (!componentStatus.endpoints.hasOwnProperty(endpointName)) {
              continue;
            }
            const url = componentStatus.endpoints[endpointName].url;
            if (url) {
              const variables = this.createVariables(endpointName, url);
              const variableSubscriptions = await Promise.all(
                variables.map(variable => che.variables.registerVariable(variable))
              );
              variableSubscriptions.forEach(subscription => startPoint.getSubscriptions().push(subscription));
            }
          }
        }
      })
    );
  }

  private createVariables(serverName: string, url: string): che.Variable[] {
    return [
      {
        name: `server.${serverName}`,
        description: url,
        resolve: async () => url,
        isResolved: true,
      },
      {
        name: `endpoint.${serverName}`,
        description: url,
        resolve: async () => url,
        isResolved: true,
      },
    ];
  }
}
