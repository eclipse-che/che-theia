/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { CommandRegistryImpl } from '@theia/plugin-ext/lib/plugin/command-registry';
import { overrideUri } from './che-content-aware-utils';

export class ExecuteCommandContainerAware {
    static makeExecuteCommandContainerAware(commandRegistryExt: CommandRegistryImpl): void {
        const executeCommandContainerAware = new ExecuteCommandContainerAware();
        executeCommandContainerAware.overrideExecuteCommand(commandRegistryExt);
    }

    overrideExecuteCommand(commandRegistryExt: CommandRegistryImpl): void {
        const originalExecuteCommand = commandRegistryExt.executeCommand.bind(commandRegistryExt);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executeCommand = (id: string, ...args: any[]) => originalExecuteCommand(id, ...args.map(arg => arg.scheme ? overrideUri(arg) : arg));
        commandRegistryExt.executeCommand = executeCommand;
    }
}
