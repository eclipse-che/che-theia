/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { che } from '@eclipse-che/api';

export class CheWorkspaceUtils {
    static getWorkspaceModificationTime(workspace: che.workspace.Workspace): number {
        if (workspace.attributes) {
            if (workspace.attributes.updated) {
                return parseInt(workspace.attributes.updated);
            } else if (workspace.attributes.created) {
                return parseInt(workspace.attributes.created);
            }
        }

        return NaN;
    }

    static getWorkspaceStack(workspace: che.workspace.Workspace): string | undefined {
        return workspace.attributes && workspace.attributes.stackName ? workspace.attributes.stackName : 'Custom';
    }

    static getWorkspaceName(workspace: che.workspace.Workspace): string | undefined {
        if (workspace.devfile && workspace.devfile.metadata) {
            return workspace.devfile.metadata.name;
        }
    }

    static modificationTimeComparator(a: che.workspace.Workspace, b: che.workspace.Workspace): number {
        const updatedA: number = CheWorkspaceUtils.getWorkspaceModificationTime(a);
        const updatedB: number = CheWorkspaceUtils.getWorkspaceModificationTime(b);

        if (isNaN(updatedA) || isNaN(updatedB)) {
            return 0;
        } else {
            return updatedB - updatedA;
        }
    }
}
