/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { injectable } from 'inversify';

/**
 * Manage access to env variables defined by a dev workspace
 */
@injectable()
export class K8sDevWorkspaceEnvVariables {
  /**
   * workspaceId - workspace ID taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceId: string;

  /**
   * workspaceName - workspace name taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceName: string;

  /**
   * workspaceNamespace - workspace namespace taken from environment variable, always the same at workspace lifecycle
   */
  private readonly workspaceNamespace: string;

  constructor() {
    if (process.env.DEVWORKSPACE_ID === undefined) {
      console.error('Environment variable DEVWORKSPACE_ID is not set');
    } else {
      this.workspaceId = process.env.DEVWORKSPACE_ID;
    }
    if (process.env.DEVWORKSPACE_NAMESPACE === undefined) {
      console.error('Environment variable DEVWORKSPACE_NAMESPACE is not set');
    } else {
      this.workspaceNamespace = process.env.DEVWORKSPACE_NAMESPACE;
    }
    if (process.env.DEVWORKSPACE_NAME === undefined) {
      console.error('Environment variable DEVWORKSPACE_NAME is not set');
    } else {
      this.workspaceName = process.env.DEVWORKSPACE_NAME;
    }
  }

  getWorkspaceId(): string {
    return this.workspaceId;
  }

  getWorkspaceName(): string {
    return this.workspaceName;
  }

  getWorkspaceNamespace(): string {
    return this.workspaceNamespace;
  }
}
