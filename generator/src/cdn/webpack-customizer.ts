/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

const path = require('path');
import * as webpack from 'webpack';
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

export function customizeWebpackConfig(
    cdn: string,
    monacopkg: string,
    monacohtmlcontribpkg: string,
    monacocsscontribpkg: string,
    baseConfig: any): any {

    let theiaCDN = '';
    let monacoCDN = '';

    if (cdn) {
        if (fs.existsSync(cdn)) {
            const cdnJson = JSON.parse(fs.readFileSync(cdn, 'utf8'));
            theiaCDN = cdnJson.theia;
            monacoCDN = cdnJson.monaco;
        }
    }

    if (monacoCDN &&
        !(monacopkg && monacohtmlcontribpkg && monacocsscontribpkg)) {
        throw new Error("Please check that you specified the three parameters: '--env.monacopkg', '--env.monacohtmlcontribpkg', '--env.monacocsscontribpkg'");
    }

    if (theiaCDN || monacoCDN) {

        const assemblyRoot = path.resolve(__dirname, '..');
        const theiaRoot = path.resolve(assemblyRoot, '..', '..');
        const frontendIndex = path.resolve(assemblyRoot, 'src-gen', 'frontend', 'index.js');
        const cheExtensions = path.resolve(theiaRoot, 'che') + '/';

        // Add the cdn-support.js file at the beginning of the entries.
        // It contains the logic to load various types of files from the configured CDN
        // if available, or fallback to the local file
        const originalEntry = baseConfig.entry;
        baseConfig.entry = {
            'cdn-support': path.resolve(__dirname, 'bootstrap.js'),
            'theia': originalEntry
        };

        // Include the content hash to enable long-term caching
        baseConfig.output.filename = '[name].[chunkhash].js';

        // Separate the webpack runtime module, theia modules, external vendor modules
        // in 3 distinct chhunks to optimize caching management
        baseConfig.optimization = {
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    che: {
                        test(module: any, chunks: any) {
                            const req = module.userRequest;
                            const takeit = req && (req.endsWith(frontendIndex) ||
                                req.includes(cheExtensions));
                            if (takeit) {
                                console.info('Added in Che chunk: ', module.userRequest);
                            }
                            return takeit;
                        },
                        name: 'che',
                        chunks: 'all',
                        enforce: true,
                        priority: 1
                    },
                    vendors: {
                        test: /[\/]node_modules[\/](?!@theia[\/])/,
                        name: 'vendors',
                        chunks: 'all',
                        enforce: true
                    }
                }
            }
        };

        // Use our own HTML template to trigger the CDN-supporting
        // logic, with the CDN prefixes passed as env parameters
        baseConfig.plugins.push(new HtmlWebpackPlugin({
            filename: 'index.html',
            template: 'cdn/custom-html.html',
            inject: false,
            customparams: {
                cdnPrefix: theiaCDN,
                monacoCdnPrefix: monacoCDN,
                cachedChunkRegexp: '^(theia|che|vendors)\.[^.]+\.js$',
                cachedResourceRegexp: '^.*\.(wasm|woff2|gif)$',
                monacoEditorCorePackage: monacopkg,
                monacoHtmlContribPackage: monacohtmlcontribpkg,
                monacoCssContribPackage: monacocsscontribpkg
            }
        }));

        // Use hashed module IDs to ease caching support
        // and avoid the hash-based chunk names being changed
        // unexpectedly
        baseConfig.plugins.push(new webpack.HashedModuleIdsPlugin());

        // Insert a custom loader to override file and url loaders,
        // in order to insert CDN-related logic
        baseConfig.module.rules.filter((rule: any) => rule.loader && rule.loader.match(/(file-loader|url-loader)/))
            .forEach((rule: any) => {
                const originalLoader: any = {
                    loader: rule.loader
                };

                if (rule.options) {
                    originalLoader.options = rule.options;
                }

                delete rule.options;
                delete rule.loader;
                rule.use = [
                    {
                        loader: path.resolve('cdn/webpack-loader.js'),
                    },
                    originalLoader
                ];
            });
    }
}
