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
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    entry: './src/plugin/webworker/che-api-worker-provider.ts',
    devtool: 'source-map',
    mode: 'production',
    node:{
        fs: 'empty',
        child_process: 'empty',
        net: 'empty',
        crypto: 'empty'
    },
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
        new CleanWebpackPlugin(['lib/webworker'])
    ],
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        filename: 'che-api-worker-provider.js',
        libraryTarget: "var",
        library: "che_api_provider",
        path: path.resolve(__dirname, 'lib/webworker')
    }
};
