/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Workspace } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

export class CheWorkspaceUtils {
  static getWorkspaceModificationTime(workspace: Workspace): number {
    if (workspace.attributes) {
      if (workspace.attributes.updated) {
        return parseInt(workspace.attributes.updated);
      } else if (workspace.attributes.created) {
        return parseInt(workspace.attributes.created);
      }
    }

    return NaN;
  }

  static getWorkspaceStack(workspace: Workspace): string | undefined {
    return workspace.attributes && workspace.attributes.stackName ? workspace.attributes.stackName : 'Custom';
  }

  static modificationTimeComparator(a: Workspace, b: Workspace): number {
    const updatedA: number = CheWorkspaceUtils.getWorkspaceModificationTime(a);
    const updatedB: number = CheWorkspaceUtils.getWorkspaceModificationTime(b);

    if (isNaN(updatedA) || isNaN(updatedB)) {
      return 0;
    } else {
      return updatedB - updatedA;
    }
  }
}
