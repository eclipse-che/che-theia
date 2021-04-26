/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DeployedPlugin, HostedPluginClient } from '@theia/plugin-ext';
import {
  GetResourceResponse,
  GetResourceStatResponse,
  InternalMessage,
  InternalMessagePayload,
  InternalRequestResponsePayload,
} from './internal-protocol';
import { inject, injectable, postConstruct } from 'inversify';

import { HostedPluginMapping } from './plugin-remote-mapping';
import { ILogger } from '@theia/core/lib/common';
import { PluginDiscovery } from './plugin-discovery';
import { Stat } from '@theia/filesystem/lib/common/files';
import { Websocket } from './websocket';
import { getPluginId } from '@theia/plugin-ext/lib/common';

type PromiseResolver = (value?: unknown) => void;

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
   * Request id's for "internal requests"
   */
  private nextMessageId = 0;
  /**
   * Mapping between resource request id (pluginId_resourcePath) and resource query callback.
   */
  private pendingInternalRequests: Map<string, PromiseResolver> = new Map<string, PromiseResolver>();

  @postConstruct()
  protected postConstruct(): void {
    this.setupDiscovery();
    this.setupWebsocket();
  }

  public clientClosed(): void {
    Array.from(this.endpointsSockets.values()).forEach(websocket => {
      websocket.send(
        JSON.stringify({
          internal: {
            method: 'stop',
          },
        })
      );
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
      if (InternalMessage.is(parsed)) {
        this.handleLocalMessage(parsed.internal);
        return;
      }
      this.sendToClient(endpointAdress, messageRaw);
    };

    // when websocket is opened, send the order
    websocket.onOpen = event => {
      websocket.send(
        JSON.stringify({
          internal: {
            endpointName: endpointAdress,
            metadata: 'request',
          },
        })
      );
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
  onMessage(pluginHostId: string, jsonMessage: string): void {
    // do the routing depending on the plugin's endpoint

    const websocket = this.endpointsSockets.get(pluginHostId);
    // socket ?
    if (!websocket) {
      this.logger.error('no websocket configured for the given plugin host', pluginHostId, 'skipping message');
      return;
    }
    websocket.send(jsonMessage);
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
        if (!this.hostedPluginMapping.hasEndpoint(entryName)) {
          this.hostedPluginMapping.setEndpoint(entryName, jsonMessage.endpointName);
          if (this.client) {
            this.client.onDidDeploy();
          }
        }
      });
      return;
    }

    if (InternalRequestResponsePayload.is(jsonMessage)) {
      this.onInternalRequestResponse(jsonMessage);
      return;
    }
  }

  requestPluginResourceStat(pluginId: string, resourcePath: string): Promise<Stat> {
    return this.sendInternalRequest<GetResourceStatResponse>(pluginId, {
      method: 'getResourceStat',
      pluginId: pluginId,
      path: resourcePath,
    }).then((value: GetResourceStatResponse) => {
      if (value.stat) {
        return value.stat;
      }
      throw new Error(`No stat found for ${pluginId}, ${resourcePath}`);
    });
  }

  requestPluginResource(pluginId: string, resourcePath: string): Promise<Buffer> {
    return this.sendInternalRequest<GetResourceResponse>(pluginId, {
      method: 'getResource',
      pluginId: pluginId,
      path: resourcePath,
    }).then((value: GetResourceResponse) => {
      const resourceBase64 = value.data;
      if (resourceBase64) {
        return Buffer.from(resourceBase64, 'base64');
      }
      throw new Error(`No resource found for ${pluginId}, ${resourcePath}`);
    });
  }

  /**
   * Send the given message back to the client
   * @param message the message to send
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToClient(pluginHostId: string, message: any): void {
    if (this.client) {
      this.client.postMessage(pluginHostId, message);
    }
  }

  /**
   * Provides additional plugin ids.
   */
  public async getExtraDeployedPluginIds(): Promise<string[]> {
    return [].concat
      .apply([], [...this.pluginsDeployedPlugins.values()])
      .map((deployedPlugin: DeployedPlugin) => deployedPlugin.metadata.model.id);
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
  public sendInternalRequest<T extends InternalMessagePayload>(pluginId: string, message: object): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.hasEndpoint(pluginId)) {
        const endpoint = this.hostedPluginMapping.getEndpoint(pluginId);
        if (!endpoint) {
          reject(new Error(`No endpoint for plugin: ${pluginId}`));
        }
        const targetWebsocket = this.endpointsSockets.get(endpoint!);
        if (!targetWebsocket) {
          reject(new Error(`No websocket connection for plugin: ${pluginId}`));
        } else {
          const requestId = this.getNextMessageId();
          this.pendingInternalRequests.set(requestId, resolve);
          const msg = {
            internal: {
              requestId: requestId,
              ...message,
            },
          };
          targetWebsocket.send(JSON.stringify(msg));
        }
      } else {
        reject(new Error('No endpoint found for plugin ' + pluginId));
      }
    });
  }

  /**
   * Handles all responses from all remote plugins.
   * Resolves promise from getResource method with requested data.
   */
  onInternalRequestResponse(msg: InternalRequestResponsePayload): void {
    const resourceResponsePromiseResolver = this.pendingInternalRequests.get(msg.requestId);
    if (resourceResponsePromiseResolver) {
      // This response is being waited for
      this.pendingInternalRequests.delete(msg.requestId);
      resourceResponsePromiseResolver(msg);
    } else {
      console.error('got response to unknown request: ' + JSON.stringify(msg));
    }
  }

  private getNextMessageId(): string {
    this.nextMessageId++;
    return this.nextMessageId.toString();
  }
}
