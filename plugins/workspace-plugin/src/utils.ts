/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che as cheApi } from '@eclipse-che/api';
import * as che from '@eclipse-che/plugin';

export async function getEditorContainerName(): Promise<string | undefined> {
    const TYPE: string = 'type';
    const EDITOR_SERVER_TYPE: string = 'ide';
    const containers = await getContainerList();
    for (const container of containers) {
        const servers = container.servers || {};
        for (const serverName in servers) {
            if (!servers.hasOwnProperty(serverName)) {
                continue;
            }
            const attrs = servers[serverName].attributes || {};
            for (const attrName in attrs) {
                if (attrName === TYPE && attrs[attrName] === EDITOR_SERVER_TYPE) {
                    return container.name;
                }
            }
        }
    }
}

export async function getContainerList(): Promise<WorkspaceContainer[]> {
    const containers: WorkspaceContainer[] = [];
    try {
        const workspace = await che.workspace.getCurrentWorkspace();

        if (workspace.runtime && workspace.runtime.machines) {
            const machines = workspace.runtime.machines;
            for (const machineName in machines) {
                if (!machines.hasOwnProperty(machineName)) {
                    continue;
                }
                const container: WorkspaceContainer = { name: machineName, ...machines[machineName] };
                containers.push(container);
            }
        }
    } catch (e) {
        throw new Error('Unable to get list workspace containers. Cause: ' + e);
    }
    return containers;
}

export interface WorkspaceContainer extends cheApi.workspace.Machine {
    name: string
}
