/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { CommandRegistry, Command, CommandContribution } from '@theia/core/lib/common';
import { OpenerService } from '@theia/core/lib/browser';

/**
 * Commands that will be used by server-side for Cli Endpoint.
 */
@injectable()
export class CliEndpointCommands implements CommandContribution {

    @inject(OpenerService)
    private openerService: OpenerService;

    registerCommands(commandRegistry: CommandRegistry): void {
        const command: Command = {
            id: 'cli-endpoint:open-file'
        };

        commandRegistry.registerCommand(command, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            execute: (...args: any) => this.openFile(args)
        });
    }

    /**
     * Open given list of arguments that are type of string.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async openFile(args: any[]): Promise<void> {
        let files: string[] = [];
        if (args) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            files = args.filter((arg: any) => typeof arg === 'string');
        }
        for await (const file of files) {
            const fileUri: URI = new URI(file);
            const opener = await this.openerService.getOpener(fileUri);
            if (opener) {
                // do not await as need to wait that file is closed to have promise resolved.
                opener.open(fileUri);
            }
        }
    }

}
