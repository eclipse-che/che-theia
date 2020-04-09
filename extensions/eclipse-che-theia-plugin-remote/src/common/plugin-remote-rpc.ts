/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { createProxyIdentifier } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { DeployedPlugin, ConfigStorage, PluginPackage } from '@theia/plugin-ext/lib/common';

export interface PluginRemoteNode {
    $initExternalPlugins(externalPlugins: DeployedPlugin[]): Promise<void>;
    $loadPlugin(pluginId: string, configStorage: ConfigStorage): Promise<void>;
    $activatePlugin(pluginId: string): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $callLocalMethod(callId: number, index: number, ...args: any[]): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $callMethod(fromHostId: string, pluginId: string, callId: number, entryName: string, ...args: any[]): Promise<any>;
    $definePluginExports(hostId: string, pluginId: string, proxyNames: string[]): Promise<void>;
    $definePluginPackage(pluginId: string, rawModel: PluginPackage): Promise<void>;
}

export interface PluginRemoteBrowser {
    $loadPlugin(pluginID: string, configStorage: ConfigStorage): Promise<void>;
    $activatePlugin(pluginId: string): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $callMethod(fromHostId: string, pluginId: string, callId: number, entryName: string, ...args: any[]): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $callLocalMethod(hostId: string, callId: number, index: number, ...args: any[]): Promise<any>;
    $definePluginExports(pluginId: string, proxyNames: string[]): Promise<void>;
    $definePluginPackage(pluginId: string, rawModel: PluginPackage): Promise<void>;
}

export const MAIN_REMOTE_RPC_CONTEXT = {
    PLUGIN_REMOTE_NODE: createProxyIdentifier<PluginRemoteNode>('PluginRemoteNode'),
    PLUGIN_REMOTE_BROWSER: createProxyIdentifier<PluginRemoteBrowser>('PluginRemoteBrowser'),
};
