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

import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';

const TERMINAL_SERVER_TYPE = 'collocated-terminal';

export interface WorkspaceContainer extends che.devfile.DevfileComponentStatus {}

@injectable()
export class CheWorkspaceClient {
  /** Returns 'key -> url' map of links for the current workspace. */
  async getLinks(): Promise<{ [key: string]: string } | undefined> {
    const workspace = await this.getCurrentWorkspace();
    return workspace.links;
  }

  async getComponentStatuses(): Promise<che.devfile.DevfileComponentStatus[]> {
    return che.devfile.getComponentStatuses();
  }

  async getCommands(): Promise<che.devfile.DevfileCommand[]> {
    const devfile = await che.devfile.get();
    return devfile.commands || [];
  }

  getCurrentWorkspace(): Promise<cheApi.workspace.Workspace> {
    return che.workspace.getCurrentWorkspace();
  }

  async getWorkspaceId(): Promise<string | undefined> {
    const workspace = await this.getCurrentWorkspace();
    return workspace.id;
  }

  async getMachineExecServerURL(): Promise<string> {
    const machineExecEndpoint = await this.getMachineExecEndpoint();
    const port = machineExecEndpoint.targetPort;
    return `ws://127.0.0.1:${port}`;
  }

  protected async getMachineExecEndpoint(): Promise<che.endpoint.ExposedEndpoint> {
    const terminalEndpoints = await che.endpoint.getEndpointsByType(TERMINAL_SERVER_TYPE);
    if (terminalEndpoints.length === 1) {
      return terminalEndpoints[0];
    }
    throw new Error(
      `Unable to find a single endpoint with type ${TERMINAL_SERVER_TYPE}: Found ${terminalEndpoints.length} item(s): ${terminalEndpoints}`
    );
  }
}
