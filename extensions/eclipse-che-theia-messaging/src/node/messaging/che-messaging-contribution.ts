/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as http from 'http';
import * as net from 'net';
import * as ws from 'ws';

import { Container, inject, injectable } from 'inversify';

import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { MessagingContribution } from '@theia/core/lib/node/messaging/messaging-contribution';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class CheMessagingContribution extends MessagingContribution {
  private connectionContainers: Set<Container> = new Set();
  private connectionContainersMap: Map<ws, Container> = new Map();

  @inject(EndpointService)
  protected endpointService: EndpointService;

  /**
   * Keep reference to containers used by connections
   */
  protected createSocketContainer(socket: ws): Container {
    const connectionContainer: Container = super.createSocketContainer(socket);
    this.connectionContainers.add(connectionContainer);
    this.connectionContainersMap.set(socket, connectionContainer);
    socket.on('close', () => {
      const toDeleteContainer = this.connectionContainersMap.get(socket);
      this.connectionContainersMap.delete(socket);
      if (toDeleteContainer) {
        this.connectionContainers.delete(toDeleteContainer);
      }
    });
    return connectionContainer;
  }

  protected async handleHttpUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer): Promise<void> {
    if (await this.isRequestAllowed(request)) {
      super.handleHttpUpgrade(request, socket, head);
    } else {
      console.error(`Refused a WebSocket connection: ${request.connection.remoteAddress}`);
      socket.destroy();
    }
  }

  async isRequestAllowed(request: http.IncomingMessage): Promise<boolean> {
    const theiaEndpoints = await this.endpointService.getEndpointsByName('theia', 'theia-dev', 'theia-dev-flow');
    const theiaEndpointsUri = theiaEndpoints.map(endpoint => new URI(endpoint.url));

    const requestOrigin = request.headers.origin;
    if (typeof requestOrigin !== 'string') {
      return false;
    }
    const requestOriginURI = new URI(requestOrigin);

    return theiaEndpointsUri.some(uri => requestOriginURI.isEqualOrParent(uri));
  }

  public getConnectionContainers(): Container[] {
    return Array.from(this.connectionContainers);
  }
}
