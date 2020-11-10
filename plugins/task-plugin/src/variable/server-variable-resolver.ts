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

/**
 * Contributes the substitution variables, in form of `server.<name>`,
 * which are resolved to the URL of the server of Che machines.
 */
@injectable()
export class ServerVariableResolver {
  @inject(CheWorkspaceClient)
  protected readonly cheWorkspaceClient!: CheWorkspaceClient;

  async registerVariables(): Promise<void> {
    const machines = await this.cheWorkspaceClient.getMachines();
    for (const machineName in machines) {
      if (!machines.hasOwnProperty(machineName)) {
        continue;
      }

      const servers = machines[machineName].servers!;

      for (const serverName in servers) {
        if (!servers.hasOwnProperty(serverName)) {
          continue;
        }

        const url = servers[serverName].url;
        if (url) {
          const variableSubscription = await che.variables.registerVariable(this.createVariable(serverName, url));
          startPoint.getSubscriptions().push(variableSubscription);
        }
      }
    }
  }

  private createVariable(serverName: string, url: string): che.Variable {
    return {
      name: `server.${serverName}`,
      description: url,
      resolve: async () => url,
      isResolved: true,
    };
  }
}
