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
import { HostedPluginClient, DeployedPlugin } from '@theia/plugin-ext';
import { HostedPluginMapping } from './plugin-remote-mapping';
import { Websocket } from './websocket';
import { getPluginId } from '@theia/plugin-ext/lib/common';
import { PluginDiscovery } from './plugin-discovery';

type PromiseResolver = (value?: Buffer) => void;

/**
 * Class handling remote connection for executing plug-ins.
 * @author Florent Benoit
 */
@injectable()
export class HostedPluginRemote {

    private client: HostedPluginClient | undefined;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(HostedPluginMapping)
    protected hostedPluginMapping: HostedPluginMapping;

    /**
     * Mapping between endpoint name and the websockets
     */
    private endpointsSockets = new Map<string, Websocket>();

    /**
     * Mapping between endpoint's name and the deployed plugins
     */
    private pluginsDeployedPlugins: Map<string, DeployedPlugin[]> = new Map<string, DeployedPlugin[]>();

    /**
     * Mapping between resource request id (pluginId_resourcePath) and resource query callback.
     */
    private resourceRequests: Map<string, PromiseResolver> = new Map<string, PromiseResolver>();

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

    connect(endpointAdress: string): void {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleLocalMessage(jsonMessage: any): void {
        if (jsonMessage.metadata && jsonMessage.metadata.result) {
            const deployedPlugins: DeployedPlugin[] = jsonMessage.metadata.result;
            this.pluginsDeployedPlugins.set(jsonMessage.endpointName, deployedPlugins);
            // add the mapping retreived from external plug-in if not defined
            deployedPlugins.forEach(deployedPlugin => {
                const entryName = getPluginId(deployedPlugin.metadata.model);
                if (!this.hostedPluginMapping.getPluginsEndPoints().has(entryName)) {
                    this.hostedPluginMapping.getPluginsEndPoints().set(entryName, jsonMessage.endpointName);
                    if (this.client) {
                        this.client.onDidDeploy();
                    }
                }
            });
            return;
        }

        if (jsonMessage.method === 'getResource') {
            const resourceBase64 = jsonMessage.data;
            const resource = resourceBase64 ? Buffer.from(resourceBase64, 'base64') : undefined;
            this.onGetResourceResponse(jsonMessage['pluginId'], jsonMessage['path'], resource);
            return;
        }
    }

    /**
     * Send the given message back to the client
     * @param message the message to send
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendToClient(message: any): void {
        if (this.client) {
            this.client.postMessage(message);
        }

    }

    /**
     * Provides additional plugin ids.
     */
    public async getExtraDeployedPluginIds(): Promise<string[]> {
        return [].concat.apply([], [...this.pluginsDeployedPlugins.values()]).map((deployedPlugin: DeployedPlugin) => deployedPlugin.metadata.model.id);
    }

    /**
     * Provides additional deployed plugins.
     */
    public async getExtraDeployedPlugins(): Promise<DeployedPlugin[]> {
        return [].concat.apply([], [...this.pluginsDeployedPlugins.values()]);
    }

    /**
     * Sends request to retreive plugin resource from its sidecar.
     * Returns undefined if plugin doesn't run in sidecar or doesn't exist.
     * @param pluginId id of the plugin for which resource should be retreived
     * @param resourcePath relative path of the requested resource based on plugin root directory
     */
    public requestPluginResource(pluginId: string, resourcePath: string): Promise<Buffer | undefined> | undefined {
        if (this.hasEndpoint(pluginId) && resourcePath) {
            return new Promise<Buffer>((resolve, reject) => {
                const endpoint = this.hostedPluginMapping.getPluginsEndPoints().get(pluginId);
                if (!endpoint) {
                    reject(new Error(`No endpoint for plugin: ${pluginId}`));
                }
                const targetWebsocket = this.endpointsSockets.get(endpoint!);
                if (!targetWebsocket) {
                    reject(new Error(`No websocket connection for plugin: ${pluginId}`));
                }

                this.resourceRequests.set(this.getResourceRequestId(pluginId, resourcePath), resolve);
                targetWebsocket!.send(JSON.stringify({
                    'internal': {
                        'method': 'getResource',
                        'pluginId': pluginId,
                        'path': resourcePath
                    }
                }));
            });
        }
        return undefined;
    }

    /**
     * Handles all responses from all remote plugins.
     * Resolves promise from getResource method with requested data.
     */
    onGetResourceResponse(pluginId: string, resourcePath: string, resource: Buffer | undefined): void {
        const key = this.getResourceRequestId(pluginId, resourcePath);
        const resourceResponsePromiseResolver = this.resourceRequests.get(key);
        if (resourceResponsePromiseResolver) {
            // This response is being waited for
            this.resourceRequests.delete(key);
            resourceResponsePromiseResolver(resource);
        }
    }

    private getResourceRequestId(pluginId: string, resourcePath: string): string {
        return pluginId + '_' + resourcePath;
    }

}
