/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Container, inject, injectable } from 'inversify';

import { CheMessagingContribution } from '@eclipse-che/theia-messaging/lib/node/messaging/che-messaging-contribution';
import { CliEndpoint } from '../common';
import { CommandService } from '@theia/core/lib/common';

@injectable()
export class DefaultCliEndpoint implements CliEndpoint {
  @inject(CheMessagingContribution)
  private cheMessagingContribution: CheMessagingContribution;

  async openFile(uri: string): Promise<void> {
    // get all remote connection containers
    const containers = this.cheMessagingContribution.getConnectionContainers();

    // remove last container as it should be the CLI
    containers.pop();

    // we do not wait the end of promises
    Promise.all(
      containers.map(async (connectionContainer: Container) => {
        const commandService: CommandService = connectionContainer.get(CommandService);
        return commandService.executeCommand('cli-endpoint:open-file', uri);
      })
    );
  }
}
