/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as deasync from 'deasync';
import { PluginRemoteNode, PluginRemoteBrowser } from '../common/plugin-remote-rpc';
import { DeployedPlugin, Plugin, ConfigStorage, PluginPackage } from '@theia/plugin-ext/lib/common';
import { PluginManagerExtImpl } from '@theia/plugin-ext/lib/plugin/plugin-manager';
export class CallInfo {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public functions: Map<number, Function>;
}

export class PluginRemoteNodeImpl implements PluginRemoteNode {
    private pluginManager: PluginManagerExtImpl;

    private externalRegistry: Map<string, Plugin>;

    private callId: number = 0;
    private calls: Map<number, CallInfo>;

    constructor(private readonly pluginRemoteBrowser: PluginRemoteBrowser) {
        this.externalRegistry = new Map<string, Plugin>();
        this.calls = new Map();
    }

    setPluginManager(pluginManager: PluginManagerExtImpl): void {
        this.pluginManager = pluginManager;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const originalLoadPlugin = (pluginManager as any).loadPlugin;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const originalActivatePlugin = (pluginManager as any).activatePlugin;
        const pluginRemoteBrowser = this.pluginRemoteBrowser;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pluginManager as any).loadPlugin = async (plugin: Plugin, configStorage: ConfigStorage, visited: any = new Set<string>()): Promise<boolean> => {
            // if plug-in is in another container, redirect the call to that container
            if (this.externalRegistry.has(plugin.model.id)) {
                await pluginRemoteBrowser.$loadPlugin(plugin.model.id, configStorage);
                return true;
            }
            return originalLoadPlugin.call(pluginManager, plugin, configStorage, visited);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pluginManager as any).activatePlugin = async (pluginId: string): Promise<void> => {
            if (this.externalRegistry.has(pluginId)) {
                await pluginRemoteBrowser.$activatePlugin(pluginId);
                return;
            }
            return originalActivatePlugin.call(pluginManager, pluginId);
        };
    }

    async $loadPlugin(pluginId: string, configStorage: ConfigStorage): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginManagerInternal = (this.pluginManager as any);
        let plugin = pluginManagerInternal.registry.get(pluginId);
        let waited: number = 0;
        // start is sent on all nodes, check the registry is populated for about 5seconds
        if (!plugin && waited < 100) {
            // loop to wait that plug-in is loaded into the registry as start should occur
            await this.sleep(50);
            waited++;
            plugin = pluginManagerInternal.registry.get(pluginId);
        }
        if (waited >= 100) {
            throw new Error(`Unable to load the plug-in ${pluginId}. Wait for being ready but was never loaded.`);
        }
        await pluginManagerInternal.loadPlugin(plugin, configStorage);
        const activatedPlugin = pluginManagerInternal.activatedPlugins.get(pluginId);

        // share the JSON with others
        const rawModel = plugin.rawModel;
        await this.pluginRemoteBrowser.$definePluginPackage(pluginId, rawModel);

        if (activatedPlugin && activatedPlugin.exports) {

            // do we have prototype ?
            const exported = activatedPlugin.exports;

            const prototype = Object.getPrototypeOf(exported);
            let proxyNames: Array<string> = [];
            if (prototype) {
                proxyNames = proxyNames.concat(Object.getOwnPropertyNames(prototype));
            }

            // ok now need to send that back only if there are some exports
            if (proxyNames.length > 0) {
                await this.pluginRemoteBrowser.$definePluginExports(pluginId, proxyNames);
            }
        }
    }

    async $activatePlugin(pluginId: string): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginManagerInternal = (this.pluginManager as any);
        await pluginManagerInternal.activatePlugin(pluginId);
    }

    async $definePluginPackage(pluginId: string, pluginPackage: PluginPackage): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plugin = (this.pluginManager as any).registry.get(pluginId);
        if (plugin) {
            plugin.rawModel = pluginPackage;
        }
    }

    // Promise that will wait for the deasync result.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deasyncPromise(promise: Promise<any>): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let error: any;
        let done = false;
        promise.then(res => {
            result = res;
        }, err => {
            error = err;
        }).then(() => {
            done = true;
        });
        deasync.loopWhile(() => !done);
        if (error) {
            throw error;
        }
        return result;
    }

    async $definePluginExports(hostId: string, pluginId: string, proxyNames: string[]): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginManagerInternal = (this.pluginManager as any);

        // add into the activatedPlugins stuff
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activatedPlugin: any = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proxyExports: any = {};
        activatedPlugin.exports = proxyExports;
        const remoteBrowser = this.pluginRemoteBrowser;
        const deasyncPromise = this.deasyncPromise;
        // add proxy
        const callId = this.callId++;
        proxyNames.forEach(entryName => {
            console.log(`Proxyfing exports ${hostId} ${pluginId}/${entryName}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            proxyExports[entryName] = (...args: any[]) => {
                // need to keep arguments only if arguments have functions as functions can't be propagated remotely
                const hasFunctions = args.some(arg => typeof arg === 'function');
                if (hasFunctions) {
                    const functions = new Map<number, Function>();
                    args.forEach((arg, index) => {
                        const type = typeof arg;
                        if (type === 'function') {
                            functions.set(index, arg);
                        }
                    });
                    // keep function arguments
                    this.calls.set(callId, { functions });
                }

                // remote call for this method
                return deasyncPromise(remoteBrowser.$callMethod(hostId, pluginId, callId, entryName, ...args));
            };
        });
        pluginManagerInternal.activatedPlugins.set(pluginId, activatedPlugin);
        await pluginManagerInternal.activatePlugin(pluginId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $callLocalMethod(callId: number, index: number, ...args: any[]): Promise<any> {
        const callInfo = this.calls.get(callId);
        if (callInfo) {
            const functionToInvoke = callInfo.functions.get(index);
            if (!functionToInvoke) {
                throw new Error('Requesting a local-call method to an argument that is not defined');
            }
            return functionToInvoke(...args);

        }
        console.error(`Ignoring call with callId ${callId}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $callMethod(fromHostId: string, pluginId: string, callId: number, entryName: string, ...args: any[]): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginManagerInternal = (this.pluginManager as any);
        const activatedPlugin = pluginManagerInternal.activatedPlugins.get(pluginId);
        const exports = activatedPlugin.exports;
        if (exports) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedArgs: any[] = [];
            if (args) {
                const remoteBrowser = this.pluginRemoteBrowser;
                const deasyncPromise = this.deasyncPromise;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                args.forEach((arg: any, index: number) => {
                    if (arg === undefined) {
                        // proxify
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const handler: ProxyHandler<any> = {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            apply(target: any, thisArg: any, argArray?: any): any {
                                return deasyncPromise(remoteBrowser.$callLocalMethod(fromHostId, callId, index, argArray));
                            }
                        };
                        const functionProxy = () => { };
                        const proxy = new Proxy(functionProxy, handler);
                        updatedArgs.push(proxy);
                    } else {
                        updatedArgs.push(arg);
                    }
                });
            }
            return exports[entryName](...updatedArgs);
        }
    }

    async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async $initExternalPlugins(externalPlugins: DeployedPlugin[]): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const registry: Map<string, Plugin> = (this.pluginManager as any).registry;

        externalPlugins.map(deployedPlugin => {
            const modelId = deployedPlugin.metadata.model.id;

            // empty rawModel
            const rawModel: PluginPackage = <PluginPackage>{};

            const plugin = <Plugin>{
                pluginPath: deployedPlugin.metadata.model.entryPoint.backend,
                pluginFolder: deployedPlugin.metadata.model.packagePath,
                model: deployedPlugin.metadata.model,
                rawModel,
                lifecycle: deployedPlugin.metadata.lifecycle
            };
            registry.set(modelId, plugin);

            this.externalRegistry.set(modelId, plugin);
        });
    }

}
