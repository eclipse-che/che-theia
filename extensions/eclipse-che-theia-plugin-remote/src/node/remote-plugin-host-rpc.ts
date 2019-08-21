/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { PluginHostRPC } from '@theia/plugin-ext/lib/hosted/node/plugin-host-rpc';
import { EnvExtImpl } from '@theia/plugin-ext/lib/plugin/env';
import { PreferenceRegistryExtImpl } from '@theia/plugin-ext/lib/plugin/preference-registry';
import { PluginManagerExtImpl } from '@theia/plugin-ext/lib/plugin/plugin-manager';
import { PluginMetadata } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { ExtPluginApi } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution';
import { Plugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { RemotePluginManagerExtImpl } from './remote-plugin-manager-ext';
/**
 * Handle the RPC calls.
 */
export class RemotePluginHostRPC extends PluginHostRPC {

    remotePluginManager: RemotePluginManagerExtImpl;
    // tslint:disable-next-line:no-any
    constructor(protected readonly rpc: any) {
        super(rpc);
    }

    // tslint:disable-next-line:no-any
    createPluginManager(envExt: EnvExtImpl, preferencesManager: PreferenceRegistryExtImpl, rpc: any): PluginManagerExtImpl {
        const { extensionTestsPath } = process.env;
        const self = this;
        const pluginManager = new RemotePluginManagerExtImpl({
            loadPlugin(plugin: Plugin): void {
                console.log('PLUGIN_HOST(' + process.pid + '): PluginManagerExtImpl/loadPlugin(' + plugin.pluginPath + ')');
                try {
                    // cleaning the cache for all files of that plug-in.
                    Object.keys(require.cache).forEach(function (key): void {
                        const mod: NodeJS.Module = require.cache[key];

                        // attempting to reload a native module will throw an error, so skip them
                        if (mod.id.endsWith('.node')) {
                            return;
                        }

                        // remove children that are part of the plug-in
                        let i = mod.children.length;
                        while (i--) {
                            const childMod: NodeJS.Module = mod.children[i];
                            // ensure the child module is not null, is in the plug-in folder, and is not a native module (see above)
                            if (childMod && childMod.id.startsWith(plugin.pluginFolder) && !childMod.id.endsWith('.node')) {
                                // cleanup exports - note that some modules (e.g. ansi-styles) define their
                                // exports in an immutable manner, so overwriting the exports throws an error
                                delete childMod.exports;
                                mod.children.splice(i, 1);
                                for (let j = 0; j < childMod.children.length; j++) {
                                    delete childMod.children[j];
                                }
                            }
                        }

                        if (key.startsWith(plugin.pluginFolder)) {
                            // delete entry
                            delete require.cache[key];
                            const ix = mod.parent!.children.indexOf(mod);
                            if (ix >= 0) {
                                mod.parent!.children.splice(ix, 1);
                            }
                        }

                    });
                    return require(plugin.pluginPath);
                } catch (e) {
                    console.error(e);
                }
            },
            init(raw: PluginMetadata[]): [Plugin[], Plugin[]] {
                console.log('PLUGIN_HOST(' + process.pid + '): PluginManagerExtImpl/init()');
                const result: Plugin[] = [];
                const foreign: Plugin[] = [];
                for (const plg of raw) {
                    const pluginModel = plg.model;
                    const pluginLifecycle = plg.lifecycle;

                    if (pluginModel.entryPoint!.frontend) {
                        foreign.push({
                            pluginPath: pluginModel.entryPoint.frontend!,
                            pluginFolder: plg.source.packagePath,
                            model: pluginModel,
                            lifecycle: pluginLifecycle,
                            rawModel: plg.source
                        });
                    } else {
                        let backendInitPath = pluginLifecycle.backendInitPath;
                        // if no init path, try to init as regular Theia plugin
                        if (!backendInitPath) {
                            backendInitPath = __dirname + '/scanners/backend-init-theia.js';
                        }

                        const plugin: Plugin = {
                            pluginPath: pluginModel.entryPoint.backend!,
                            pluginFolder: plg.source.packagePath,
                            model: pluginModel,
                            lifecycle: pluginLifecycle,
                            rawModel: plg.source
                        };

                        self.initContext(backendInitPath, plugin);

                        result.push(plugin);
                    }
                }
                return [result, foreign];
            },
            initExtApi(extApi: ExtPluginApi[]): void {
                for (const api of extApi) {
                    if (api.backendInitPath) {
                        try {
                            const extApiInit = require(api.backendInitPath);
                            extApiInit.provideApi(rpc, pluginManager);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            },
            loadTests: extensionTestsPath ? async () => {
                // tslint:disable:no-any
                // Require the test runner via node require from the provided path
                let testRunner: any;
                let requireError: Error | undefined;
                try {
                    testRunner = require(extensionTestsPath);
                } catch (error) {
                    requireError = error;
                }

                // Execute the runner if it follows our spec
                if (testRunner && typeof testRunner.run === 'function') {
                    return new Promise<void>((resolve, reject) => {
                        testRunner.run(extensionTestsPath, (error: any) => {
                            if (error) {
                                reject(error.toString());
                            } else {
                                resolve(undefined);
                            }
                        });
                    });
                }
                throw new Error(requireError ?
                    requireError.toString() :
                    `Path ${extensionTestsPath} does not point to a valid extension test runner.`
                );
            } : undefined
        }, envExt, preferencesManager, rpc);
        this.remotePluginManager = pluginManager;
        return pluginManager;
    }
}
