/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as decls from './base';
const fs = require('fs-extra');

export class CdnHtmlTemplate {
    cdnInfo: decls.CdnInfo;
    nocacheChunks: decls.CdnChunk[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(readonly htmlWebpackPlugin: any, readonly compilation: any) {
        const cachedChunks: decls.CdnChunk[] = [];
        const cachedChunkRegexp = new RegExp(htmlWebpackPlugin.options.customparams.cachedChunkRegexp);
        const cachedResourceRegexp = new RegExp(htmlWebpackPlugin.options.customparams.cachedResourceRegexp);
        const cdnPrefix = htmlWebpackPlugin.options.customparams.cdnPrefix ? htmlWebpackPlugin.options.customparams.cdnPrefix : '';
        const monacoCdnPrefix = htmlWebpackPlugin.options.customparams.monacoCdnPrefix ? htmlWebpackPlugin.options.customparams.monacoCdnPrefix : '';
        const monacoEditorCorePackage = htmlWebpackPlugin.options.customparams.monacoEditorCorePackage ? htmlWebpackPlugin.options.customparams.monacoEditorCorePackage : '';

        // eslint-disable-next-line guard-for-in
        for (const key in htmlWebpackPlugin.files.chunks) {
            const url: string = htmlWebpackPlugin.files.chunks[key].entry;
            const chunk: decls.CdnChunk = {
                chunk: url,
                cdn: undefined
            };

            if (cdnPrefix && url.match(cachedChunkRegexp)) {
                chunk.cdn = cdnPrefix + url;
                cachedChunks.push(chunk);
            } else {
                this.nocacheChunks.push(chunk);
            }
        }
        const cachedResourceFiles: decls.CdnResource[] = [];
        if (cdnPrefix) {
            let asset: string;
            for (asset in compilation.assets) {
                if (asset.match(cachedResourceRegexp)) {
                    cachedResourceFiles.push({
                        'resource': asset,
                        'cdn': cdnPrefix + asset
                    });
                }
            }
        }

        const vsLoader: decls.CdnExternal = {
            external: './vs/original-loader.js',
            cdn: undefined
        };
        const monacoEditorCorePath: decls.CdnExternal = {
            external: 'vs/editor/editor.main',
            cdn: undefined
        };

        if (monacoCdnPrefix) {
            vsLoader.cdn = monacoCdnPrefix + monacoEditorCorePackage + '/min/vs/loader.js';
            monacoEditorCorePath.cdn = monacoCdnPrefix + monacoEditorCorePackage + '/min/' + monacoEditorCorePath.external;
        }

        const monacoRequirePaths = [
            monacoEditorCorePath,
        ];

        if (cdnPrefix || monacoCdnPrefix) {
            const monacoFiles: decls.CdnExternal[] = monacoRequirePaths.map(elem =>
                ['.js', '.css', '.nls.js'].map(extension => ({
                    'external': elem.external + extension,
                    'cdn': elem.cdn + extension
                })).filter(elemt => compilation.assets[elemt.external])
            ).reduce((acc, val) => acc.concat(val), []);

            monacoFiles.push(vsLoader);

            fs.ensureDirSync('lib');
            fs.writeFileSync('lib/cdn.json', JSON.stringify(
                (<decls.CdnArtifact[]>cachedChunks).concat(<decls.CdnArtifact[]>monacoFiles).concat(<decls.CdnArtifact[]>cachedResourceFiles),
                undefined, 2));
        }

        this.cdnInfo = {
            chunks: cachedChunks,
            resources: cachedResourceFiles,
            monaco: {
                vsLoader: vsLoader,
                requirePaths: monacoRequirePaths
            }
        };
    }

    generateCdnScript(): string {
        return `new ${decls.CheCdnSupport.className}(${JSON.stringify(this.cdnInfo)}).buildScripts();`;
    }
}
