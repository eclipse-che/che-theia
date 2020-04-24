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
import * as theia from '@theia/plugin';
import { execute } from './exec';

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

export async function execInTerminal(directory: string, locationURI: string, ...args: string[]): Promise<void> {
    const editorContainerName = await getEditorContainerName() as string;
    try {
        const shellArgs: string[] = ['-c', 'git'].concat(args);
        const terminalOptions: theia.TerminalOptions = {
            cwd: directory,
            shellPath: 'sh',
            shellArgs: shellArgs,
            name: `${args[0]} ${locationURI}`,
            attributes: {
                CHE_MACHINE_NAME: editorContainerName,
                closeWidgetExitOrError: 'false',
                interruptProcessOnClose: 'true'
            }
        };
        const terminal = theia.window.createTerminal(terminalOptions);
        terminal.show();
        await terminal.processId;
    } catch (error) {
        console.error(`Couldn't clone ${locationURI}: ${error.message}`);
        throw new Error(`Couldn't clone ${locationURI}: ${error.message}`);
    }
}

export async function checkRepoAccess(locationURI: string): Promise<boolean> {
    try {
        await execute('wget', ['--spider', locationURI]);
    } catch (error) {
        if (error.message.endsWith('401 Unauthorized\n')) {
            return Promise.resolve(true);
        }
    }
    return Promise.resolve(false);
}

export interface WorkspaceContainer extends cheApi.workspace.Machine {
    name: string
}
