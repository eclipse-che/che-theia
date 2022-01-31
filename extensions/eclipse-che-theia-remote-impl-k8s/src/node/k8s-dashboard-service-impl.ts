/**********************************************************************
 * Copyright (c) 2021-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { DashboardService } from '@eclipse-che/theia-remote-api/lib/common/dashboard-service';
import { K8sDevWorkspaceEnvVariables } from './k8s-devworkspace-env-variables';

@injectable()
export class K8sDashboardServiceImpl implements DashboardService {
  @inject(K8sDevWorkspaceEnvVariables)
  private k8sDevWorkspaceEnvVariables: K8sDevWorkspaceEnvVariables;

  async getDashboardUrl(): Promise<string | undefined> {
    return this.k8sDevWorkspaceEnvVariables.getDashboardURL();
  }

  async getEditorUrl(): Promise<string | undefined> {
    const dashboardURL = this.k8sDevWorkspaceEnvVariables.getDashboardURL();
    const namespace = this.k8sDevWorkspaceEnvVariables.getWorkspaceNamespace();
    const workspaceName = this.k8sDevWorkspaceEnvVariables.getWorkspaceName();

    return `${dashboardURL}/dashboard/#/ide/${namespace}/${workspaceName}`;
  }
}
