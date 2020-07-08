/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { inject, injectable, Container } from 'inversify';
import { CliEndpoint } from '../common';
import { FileUri } from '@theia/core/lib/node';
import { CommandService } from '@theia/core/lib/common';
import { CheMessagingContribution } from '@eclipse-che/theia-messaging/lib/node/messaging/che-messaging-contribution';
@injectable()
export class DefaultCliEndpoint implements CliEndpoint {

    @inject(CheMessagingContribution)
    private cheMessagingContribution: CheMessagingContribution;

    async openFile(file: string): Promise<void> {
        const fileUri = FileUri.create(file);

        // get all remote connection containers
        const containers = this.cheMessagingContribution.getConnectionContainers();

        // remove last container as it should be the CLI
        containers.pop();

        // we do not wait the end of promises
        Promise.all(containers.map(async (connectionContainer: Container) => {
            const commandService: CommandService = connectionContainer.get(CommandService);
            return commandService.executeCommand('cli-endpoint:open-file', fileUri.toString());
        }));
    };
}
