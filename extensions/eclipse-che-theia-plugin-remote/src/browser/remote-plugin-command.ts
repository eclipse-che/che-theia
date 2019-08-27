/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import { CommandRegistry, CommandContribution, Command } from '@theia/core/lib/common';
import { RemotePluginInitializerService } from '../common/remote-plugin-protocol';

const COMMAND: Command = {
    id: '_remote.plugins.start'
};

@injectable()
export class RemotePluginCommandContribution implements CommandContribution {

    @inject(RemotePluginInitializerService)
    private starterService: RemotePluginInitializerService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(COMMAND, {
            execute: () => {
                this.starterService.loadRemotePlugins();
            },
            isVisible: () => false,
            isEnabled: () => true
        });
    }
}
