/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-null/no-null */
import * as fs from 'fs-extra';

import { customizeWebpackConfig } from '../../src/cdn/webpack-customizer';

const path = require('path');

describe('Test webpack customizer', () => {
    let baseConfig: any;

    beforeEach(() => {
        baseConfig = {
            entry: 'originalEntry',
            output: {},
            plugins: [],
            module: {
                rules: [
                    {
                        loader: 'file-loader',
                    },
                    {
                        loader: 'url-loader',
                        options: {},
                    },
                    {
                        loader: 'other-loader',
                    },
                ],
            },
        };
        try {
            fs.removeSync('cdn.json');
        } catch (err) {}
    });

    afterEach(() => {
        try {
            fs.removeSync('cdn.json');
        } catch (err) {}
    });

    test('test with no CDN file', async () => {
        const initialBaseConfig: string = baseConfig.toString();
        customizeWebpackConfig('', '', baseConfig);
        expect(baseConfig.toString()).toBe(initialBaseConfig);
    });

    test('test with non-existing CDN file', async () => {
        const initialBaseConfig: string = baseConfig.toString();
        customizeWebpackConfig('cdn.json', '', baseConfig);
        expect(baseConfig.toString()).toBe(initialBaseConfig);
    });

    test('test with empty Json object in CDN file', async () => {
        await fs.writeFile('cdn.json', '{}');
        const initialBaseConfig: string = baseConfig.toString();
        customizeWebpackConfig('cdn.json', '', baseConfig);
        expect(baseConfig.toString()).toBe(initialBaseConfig);
    });

    test('test with with missing mandatory params', async () => {
        await fs.writeFile('cdn.json', '{ "theia": "http://theiaCDN/", "monaco": "http://monacoCDN/" }');
        let error: Error | null = null;
        try {
            customizeWebpackConfig('cdn.json', '', baseConfig);
        } catch (err) {
            error = err;
        }
        expect(error).toEqual(new Error("Please check that you specified the parameter '--env.monacopkg'"));
    });

    test('test basic changes', async () => {
        await fs.writeFile('cdn.json', '{ "theia": "http://theiaCDN/", "monaco": "http://monacoCDN/" }');
        customizeWebpackConfig('cdn.json', 'monacopkg', baseConfig);
        expect(baseConfig.entry['theia']).toEqual('originalEntry');
        expect(baseConfig.entry['cdn-support']).toEqual(path.resolve(__dirname, '../../src/cdn/bootstrap.js'));
        expect(baseConfig.output.filename).toBe('[name].[chunkhash].js');
        expect(baseConfig.optimization.runtimeChunk).toBe('single');
        expect(baseConfig.optimization.splitChunks.cacheGroups.vendors).toEqual({
            test: /[\/]node_modules[\/](?!@theia[\/])/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
        });
        expect(baseConfig.optimization.splitChunks.cacheGroups.che.name).toBe('che');
        expect(baseConfig.optimization.splitChunks.cacheGroups.che.chunks).toBe('all');
        expect(baseConfig.optimization.splitChunks.cacheGroups.che.enforce).toBe(true);
        expect(baseConfig.optimization.splitChunks.cacheGroups.che.priority).toBe(1);

        expect(
            baseConfig.optimization.splitChunks.cacheGroups.che.test(
                {
                    userRequest: path.resolve(__dirname, '../../src/src-gen/frontend/index.js'),
                },
                undefined
            )
        ).toBe(true);

        expect(
            baseConfig.optimization.splitChunks.cacheGroups.che.test(
                {
                    userRequest: null,
                },
                undefined
            )
        ).toBe(null);

        expect(
            baseConfig.optimization.splitChunks.cacheGroups.che.test(
                {
                    userRequest: 'somethingElse',
                },
                undefined
            )
        ).toBe(false);

        expect(baseConfig.module.rules[0]).toEqual({
            use: [
                {
                    loader: path.resolve('cdn/webpack-loader.js'),
                },
                {
                    loader: 'file-loader',
                },
            ],
        });

        expect(baseConfig.module.rules[1]).toEqual({
            use: [
                {
                    loader: path.resolve('cdn/webpack-loader.js'),
                },
                {
                    loader: 'url-loader',
                    options: {},
                },
            ],
        });

        expect(baseConfig.module.rules[2]).toEqual({
            loader: 'other-loader',
        });
    });

    test('test extensions', async () => {
        await fs.writeFile('cdn.json', '{ "theia": "http://theiaCDN/", "monaco": "http://monacoCDN/" }');
        customizeWebpackConfig('cdn.json', 'monacopkg', baseConfig);
        expect(
            baseConfig.optimization.splitChunks.cacheGroups.che.test(
                {
                    userRequest: path.resolve(__dirname, '../../../che/che-theia-remote-extension/something.js'),
                },
                undefined
            )
        ).toBe(true);
        expect(
            baseConfig.optimization.splitChunks.cacheGroups.che.test(
                {
                    userRequest: '.../node_modules/@theia/callhierarchy/something.js',
                },
                undefined
            )
        ).toBe(false);
    });
});
