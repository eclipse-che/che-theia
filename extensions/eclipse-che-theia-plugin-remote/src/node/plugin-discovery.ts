/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as dgram from 'dgram';
import { ILogger } from '@theia/core/lib/common';

/**
 * Class handling discovery of nodes
 * @author Florent Benoit
 */
export class PluginDiscovery {

    /**
     * Default Multicast PORT.
     */
    private static readonly DEFAULT_MULTICAST_PORT = '2503';

    /**
     * Default Multicast address.
     */
    private static readonly DEFAULT_MULTICAST_ADDRESS = '225.0.0.3';

    /**
     * Multicast socket.
     */
    private socket: dgram.Socket;

    /**
     * port number for multicast discovery.
     */
    private discoveryPort: number;

    /**
     * port number for multicast discovery.
     */
    private discoveryAddress: string;

    /**
     * Unique identifier of ourself used to communicate with others
     */
    private discoveryName: string;

    constructor(private readonly logger: ILogger, private readonly endpointPort?: number) {
        this.discoveryName = `discovery[${Math.random().toString(36).substring(7)}]`;
    }

    /**
     * Enter in discovery mode.
     * On start, it will :
     *  - request others to announce themselves
     *  - announce himself if endpoint.
     */
    discover(): void {

        // if discovery is disabled, do not proceed with discover.
        const discoveryDisabled = process.env.THEIA_PLUGIN_DISCOVERY_DISABLE || 'false';
        if (discoveryDisabled === 'true') {
            this.logger.warn('Plugin discovery is disabled.');
            return;
        }

        // configured port number
        this.discoveryPort = parseInt(process.env.THEIA_PLUGIN_ENDPOINT_DISCOVERY_PORT || PluginDiscovery.DEFAULT_MULTICAST_PORT, 10);

        // configured adress
        this.discoveryAddress = process.env.THEIA_PLUGIN_ENDPOINT_DISCOVERY_ADDRESS || PluginDiscovery.DEFAULT_MULTICAST_ADDRESS;
        this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket.bind(this.discoveryPort);

        // start to listen
        this.socket.on('listening', () => {
            this.socket.addMembership(this.discoveryAddress);
            // announce if we're an endpoint
            if (this.endpointPort) {
                this.announceMySelf();
            }
            this.requestEndpoints();
        });

        // handle messages
        this.socket.on('message', (msg: Buffer) => {

            // receive order
            const jsonMessage: DiscoveryMessage = JSON.parse(msg.toString());

            // ignore ourself
            if (this.discoveryName === jsonMessage.id) {
                return;
            }

            // handle message based on the type
            switch (jsonMessage.type) {
                case 'REQUEST_ENDPOINTS':
                    // need to announce ourself but only if we're an endpoint
                    if (this.endpointPort) {
                        this.announceMySelf();
                    }
                    break;

                case 'ANNOUNCE_ENDPOINT':
                    this.onNewEndpoint(JSON.parse(jsonMessage.content));
                    break;
            }

        });

    }

    /**
     * Sends the given message to the multicast discovery address.
     */
    protected send(message: DiscoveryMessage): void {
        this.socket.send(JSON.stringify(message), this.discoveryPort, this.discoveryAddress);
    }

    /**
     * Greeting message announcing ourself to the others.
     */
    protected announceMySelf(): void {

        const announceRequest: DiscoveryAnnounceRequest = {
            websocketAddress: `ws://localhost:${this.endpointPort}`
        };
        const announceMessage: DiscoveryMessage = {
            id: this.discoveryName,
            type: 'ANNOUNCE_ENDPOINT',
            content: JSON.stringify(announceRequest)
        };
        this.send(announceMessage);

    }

    /**
     * Request message asking others to announce.
     */
    protected requestEndpoints(): void {

        const announceMessage: DiscoveryMessage = {
            id: this.discoveryName,
            type: 'REQUEST_ENDPOINTS',
            content: ''
        };
        this.send(announceMessage);

    }

    // callback used when a new endpoint is registered
    public onNewEndpoint(discoveryAnnounceRequest: DiscoveryAnnounceRequest): void { }

}

/**
 * Announce Request message format
 */
interface DiscoveryAnnounceRequest {
    websocketAddress: string;
}

/**
 * Discovery message format
 */
interface DiscoveryMessage {
    id: string,

    type: 'REQUEST_ENDPOINTS' | 'ANNOUNCE_ENDPOINT',

    content: string

}
