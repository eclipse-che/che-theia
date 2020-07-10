/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import * as che from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';

/**
 * Make checks on workspace ephemeral configuration and shows dedicated information to user.
 */
export class EphemeralWorkspaceChecker {

    constructor() {
    }

    public check(): void {
        che.workspace.getCurrentWorkspace().then((workspace: cheApi.workspace.Workspace) => {
            const isEphemeralWorkspace = this.isEphemeralWorkspace(workspace);
            if (isEphemeralWorkspace) {
                this.displayEphemeralWarning();
            }
        });
    }

    /**
     * Displays warning in status bar, that workspace is ephemeral.
     */
    private displayEphemeralWarning(): void {
        const item = theia.window.createStatusBarItem(theia.StatusBarAlignment.Left);
        item.text = '$(exclamation-triangle) Ephemeral Mode';
        item.tooltip = 'All changes to the source code will be lost when the workspace is stopped unless they are pushed to a source code repository.';
        item.color = '#fcc13d';
        item.show();
    }

    /**
     * Returns, whether provided workspace is ephmeral or not.
     */
    private isEphemeralWorkspace(workspace: cheApi.workspace.Workspace): boolean {
        if (workspace.devfile) {
            const workspaceAttributes = workspace.devfile.attributes;
            if (workspaceAttributes) {
                return workspaceAttributes.persistVolumes === 'false';
            }
            return false;
        } else {
            return workspace.config!.attributes!.persistVolumes === 'false' || false;
        }
    }
}
