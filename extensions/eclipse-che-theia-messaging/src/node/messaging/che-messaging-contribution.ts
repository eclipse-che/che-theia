/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as net from 'net';
import * as http from 'http';
import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { MessagingContribution } from '@theia/core/lib/node/messaging/messaging-contribution';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { SERVER_TYPE_ATTR, SERVER_IDE_ATTR_VALUE } from '@eclipse-che/theia-plugin-ext/lib/common/che-server-common';

@injectable()
export class CheMessagingContribution extends MessagingContribution {

    @inject(CheApiService)
    protected cheApiService: CheApiService;

    protected async handleHttpUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer): Promise<void> {
        if (await this.isRequestAllowed(request)) {
            super.handleHttpUpgrade(request, socket, head);
        } else {
            console.error(`Refused a WebSocket connection: ${request.connection.remoteAddress}`);
            socket.destroy();
        }
    }

    async isRequestAllowed(request: http.IncomingMessage): Promise<boolean> {
        let theiaServer;
        try {
            theiaServer = await this.cheApiService.findUniqueServerByAttribute(SERVER_TYPE_ATTR, SERVER_IDE_ATTR_VALUE);
        } catch (e) {
            console.error(e);
            return true; // we're outside of Che Workspace, so allow a request
        }

        const requestOrigin = request.headers.origin;
        if (typeof requestOrigin !== 'string') {
            return false;
        }

        const requestOriginURI = new URI(requestOrigin).toString();
        const theiaServerURI = new URI(theiaServer.url).toString();

        return requestOriginURI === theiaServerURI;
    }
}
