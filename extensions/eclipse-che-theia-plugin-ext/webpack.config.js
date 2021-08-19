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
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: './lib/plugin/webworker/che-api-worker-provider.js',
    devtool: 'source-map',
    mode: 'production',

    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true
                        }
                    }
                ],
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: ['lib/webworker']})
    ],
    resolve: {
        fallback: {
            'child_process': false,
            'crypto': false,
            'net': false,
            'fs': false,
            'os': false,
            'path': false,
            'constants': false,
            'stream': false,
            'assert': false,
            'util': false

        },
        extensions: ['.ts', '.js']
    },
    output: {
        filename: 'che-api-worker-provider.js',
        libraryTarget: "var",
        library: "che_api_provider",
        path: path.resolve(__dirname, 'lib/webworker')
    }
};
