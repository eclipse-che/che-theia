/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject, postConstruct } from 'inversify';
import { ILogger } from '@theia/core/lib/common';
import { HostedPluginClient, PluginMetadata } from '@theia/plugin-ext';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { Websocket } from './websocket';
import { getPluginId } from '@theia/plugin-ext/lib/common';
import { PluginDiscovery } from './plugin-discovery';

/**
 * Class handling remote connection for executing plug-ins.
 * @author Florent Benoit
 */
@injectable()
export class HostedPluginRemote {

    private client: HostedPluginClient;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(HostedPluginMapping)
    protected hostedPluginMapping: HostedPluginMapping;

    /**
     * mapping between endpoint name and the websockets
     */
    private endpointsSockets = new Map<string, Websocket>();

    /**
     * mapping between endpoint's name and the websocket endpoint
     */
    private pluginsMetadata: Map<string, PluginMetadata[]> = new Map<string, PluginMetadata[]>();

    @postConstruct()
    protected postConstruct(): void {
        this.setupDiscovery();
        this.setupWebsocket();
    }

    public clientClosed(): void {

        Array.from(this.endpointsSockets.values()).forEach(websocket => {
            websocket.send(JSON.stringify({
                'internal': {
                    'method': 'stop'
                }
            }));
            websocket.close();
        });
    }

    /**
     * Called when a client is connecting to this endpoint
     */
    public setClient(client: HostedPluginClient): void {
        this.client = client;
    }

    /**
     * Handle discovery of other endpoints on same network.
     */
    protected setupDiscovery(): void {
        const pluginDiscovery = new PluginDiscovery(this.logger);
        pluginDiscovery.onNewEndpoint = announceRequest => {
            const endpointAdress = announceRequest.websocketAddress;
            // only accept new endpoint address
            if (!this.endpointsSockets.has(endpointAdress)) {
                this.logger.debug(`Adding a new remote endpoint from ${endpointAdress}`);
                this.connect(endpointAdress);
            }
        };
        pluginDiscovery.discover();
    }

    /**
     * Handle the creation of connection to remote endpoints.
     */
    setupWebsocket(): void {
        this.hostedPluginMapping.getEndPoints().forEach(endpointAdress => this.connect(endpointAdress));
    }

    connect(endpointAdress: string) {
        this.logger.debug(`Establish websocket connection to ${endpointAdress}`);
        const websocket = new Websocket(this.logger, endpointAdress);
        this.endpointsSockets.set(endpointAdress, websocket);
        websocket.onMessage = (messageRaw: string) => {
            const parsed = JSON.parse(messageRaw);
            if (parsed.internal) {
                this.handleLocalMessage(parsed.internal);
                return;
            }
            this.sendToClient(messageRaw);
        };

        // when websocket is opened, send the order
        websocket.onOpen = event => {
            websocket.send(JSON.stringify({
                'internal': {
                    'endpointName': endpointAdress,
                    'metadata': 'request'
                }
            }));
        };
    }

    /**
     * Checks if the given pluginID has a remote endpoint
     */
    hasEndpoint(pluginID: string): boolean {
        return this.hostedPluginMapping.hasEndpoint(pluginID);
    }

    /**
     * Handle the mesage to remotely send to a ws endpoint
     * @param jsonMessage the given message
     */
    // tslint:disable-next-line:no-any
    onMessage(jsonMessage: any): void {
        // do the routing depending on the plugin's endpoint
        const pluginId = jsonMessage.pluginID;

        // socket ?
        const endpoint = this.hostedPluginMapping.getPluginsEndPoints().get(pluginId);
        if (!endpoint) {
            this.logger.error('no endpoint configured for the given plugin', pluginId, 'skipping message');
            return;
        }
        const websocket = this.endpointsSockets.get(endpoint);
        websocket!.send(JSON.stringify(jsonMessage.content));
    }

    /**
     * Handle a local message
     * @param message the message to analyze locally and not sending back to client
     */
    // tslint:disable-next-line:no-any
    handleLocalMessage(jsonMessage: any): void {
        if (jsonMessage.metadata && jsonMessage.metadata.result) {
            const metadatas: PluginMetadata[] = jsonMessage.metadata.result;
            this.pluginsMetadata.set(jsonMessage.endpointName, metadatas);
            // add the mapping retreived from external plug-in if not defined
            metadatas.forEach(metadata => {
                const entryName = getPluginId(metadata.model);
                if (!this.hostedPluginMapping.getPluginsEndPoints().has(entryName)) {
                    this.hostedPluginMapping.getPluginsEndPoints().set(entryName, jsonMessage.endpointName);
                }
            });
        }
    }

    /**
     * Send the given message back to the client
     * @param message the message to send
     */
    // tslint:disable-next-line:no-any
    sendToClient(message: any) {
        if (this.client) {
            this.client.postMessage(message);
        }

    }

    /**
     * Return plugin metadata found remotely
     */
    async getExtraPluginMetadata(): Promise<PluginMetadata[]> {
        return [].concat.apply([], [...this.pluginsMetadata.values()]);
    }

}
