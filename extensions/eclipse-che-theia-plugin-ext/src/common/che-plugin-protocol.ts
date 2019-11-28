/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { JsonRpcServer } from '@theia/core';

export interface ChePluginRegistry {
    name: string,
    uri: string
}

export interface ChePlugin {
    publisher: string;
    name: string;
    version: string;
    installed: boolean;
    versionList: {
        [version: string]: ChePluginMetadata;
    }
}

/**
 * Describes properties in plugin meta.yaml
 */
export interface ChePluginMetadata {
    publisher: string,
    name: string,
    version: string,
    type: string,
    displayName: string,
    title: string,
    description: string,
    icon: string,
    url: string,
    repository: string,
    firstPublicationDate: string,
    category: string,
    latestUpdateDate: string,

    // Plugin KEY. Used to set in workpsace configuration
    key: string,
    builtIn: boolean
}

/**
 * Need to have this interface to pass list of Plugin registries through RPC.
 *
 * https://github.com/eclipse-theia/theia/issues/4310
 * https://github.com/eclipse-theia/theia/issues/4757
 * https://github.com/eclipse-theia/theia/issues/4343
 */
export interface ChePluginRegistries {
    [name: string]: ChePluginRegistry;
}

export const CHE_PLUGIN_SERVICE_PATH = '/che-plugin-service';

export const ChePluginService = Symbol('ChePluginService');

export interface ChePluginService extends JsonRpcServer<ChePluginServiceClient> {

    disconnectClient(client: ChePluginServiceClient): void;

    /**
     * Returns default plugin registry;
     */
    getDefaultRegistry(): Promise<ChePluginRegistry>;

    /**
     * Updates the plugin cache
     *
     * @param registryList list of plugin registries
     */
    updateCache(registries: ChePluginRegistries): Promise<void>;

    /**
     * Returns a list of available plugins on the plugin registry.
     *
     * @param filter filter
     * @return list of available plugins
     */
    getPlugins(filter: string): Promise<ChePluginMetadata[]>;

    /**
     * Returns list of plugins described in workspace configuration.
     */
    getWorkspacePlugins(): Promise<string[]>;

    /**
     * Adds a plugin to workspace configuration.
     */
    addPlugin(pluginKey: string): Promise<void>;

    /**
     * Removes a plugin from workspace configuration.
     */
    removePlugin(pluginKey: string): Promise<void>;

    /**
     * Changes the plugin version.
     */
    updatePlugin(oldPluginKey: string, newPluginKey: string): Promise<void>;

}

export const ChePluginServiceClient = Symbol('ChePluginServiceClient');
export interface ChePluginServiceClient {
    /**
     * Called by Plugins Service when amount of available plugins has been changed.
     */
    notifyPluginCacheSizeChanged(plugins: number): Promise<void>;

    /**
     * Called by Plugin Service when amount of cached plugins has been changed.
     */
    notifyPluginCached(plugins: number): Promise<void>;

    /**
     * Called by Plugin Service when caching of the plugins has been finished.
     */
    notifyCachingComplete(): Promise<void>;

    /**
     * Called by Plugin Service when invalid registry has been found while updating plugin cache.
     */
    invalidRegistryFound(registry: ChePluginRegistry): Promise<void>;

    /**
     * Called by Plugin Service when invalid plugin meta.yaml has been found while updating plugin cache.
     */
    invaligPluginFound(pluginYaml: string): Promise<void>;
}
