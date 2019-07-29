/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { CdnHtmlTemplate } from "../../src/cdn/html-template";
import * as fs from 'fs-extra';

describe("Test CdnHtmlTemplate", () => {
    let cachedChunkRegexp: string | undefined;
    let cachedResourceRegexp: string | undefined;
    let cdnPrefix: string | undefined;
    let monacoCdnPrefix: string | undefined;
    let monacoEditorCorePackage: string | undefined;
    let monacoHtmlContribPackage: string | undefined;
    let monacoCssContribPackage: string | undefined;
    let chunks: any;
    let assets: any;

    beforeEach(() => {
        cachedChunkRegexp = undefined;
        cachedResourceRegexp = undefined;
        cdnPrefix = undefined;
        monacoCdnPrefix = undefined;
        monacoEditorCorePackage = undefined;
        monacoHtmlContribPackage = undefined;
        monacoCssContribPackage = undefined;
        chunks = {};
        assets = {};
    });

    function buildTemplate(): CdnHtmlTemplate {
        const htmlWebpackPlugin = {
            options: {
                customparams: {
                    cachedChunkRegexp: cachedChunkRegexp,
                    cachedResourceRegexp: cachedResourceRegexp,
                    cdnPrefix: cdnPrefix,
                    monacoCdnPrefix: monacoCdnPrefix,
                    monacoEditorCorePackage: monacoEditorCorePackage,
                    monacoHtmlContribPackage: monacoHtmlContribPackage,
                    monacoCssContribPackage: monacoCssContribPackage
                }
            },
            files: {
                chunks: chunks
            }
        };
        
        const compilation = {
            assets: assets
        }
        
        return new CdnHtmlTemplate(htmlWebpackPlugin, compilation);
    }
    
    test("test chunks without CDN prefix", async () => {
        cachedChunkRegexp = 'cachedChunk.*';
        chunks = {
            chunk1: {
                entry: "cachedChunk1"
            },
            chunk2: {
                entry: "chunk2"
            }
        }
        
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.nocacheChunks).toEqual([{
            chunk: "cachedChunk1",
            cdn: undefined
        },{
            chunk: "chunk2",
            cdn: undefined
        }]);
        expect(htmlTemplate.cdnInfo.chunks).toEqual([]);
        expect(htmlTemplate.cdnInfo.resources).toEqual([]);
    });

    test("test chunks with CDN prefix", async () => {
        cachedChunkRegexp = 'cachedChunk.*';
        cdnPrefix = 'http://cdnPrefix/';
        chunks = {
            chunk1: {
                entry: "cachedChunk1"
            },
            chunk2: {
                entry: "chunk2"
            }
        }
        
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.nocacheChunks).toEqual([{
            chunk: "chunk2",
            cdn: undefined
        }]);
        expect(htmlTemplate.cdnInfo.chunks).toEqual([{
            chunk: "cachedChunk1",
            cdn: "http://cdnPrefix/cachedChunk1"
        }]);
        expect(htmlTemplate.cdnInfo.resources).toEqual([]);
    });

    test("test resources without CDN prefix", async () => {
        cachedResourceRegexp = 'cachedResource.*';
        assets = {
            "cachedResource1": {},
            "resource2": {}
        }
        
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.nocacheChunks).toEqual([]);
        expect(htmlTemplate.cdnInfo.chunks).toEqual([]);
        expect(htmlTemplate.cdnInfo.resources).toEqual([]);
    });

    test("test resources with CDN prefix", async () => {
        cachedResourceRegexp = 'cachedResource.*';
        cdnPrefix = 'http://cdnPrefix/';
        assets = {
                "cachedResource1": {},
                "resource2": {}
            }
        
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.nocacheChunks).toEqual([]);
        expect(htmlTemplate.cdnInfo.chunks).toEqual([]);
        expect(htmlTemplate.cdnInfo.resources).toEqual([{
            resource: "cachedResource1",
            cdn: "http://cdnPrefix/cachedResource1"
        }]);
    });

    test("test monaco without CDN prefix", async () => {
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.cdnInfo.monaco.vsLoader).toEqual({
            external: "./vs/original-loader.js",
            cdn: undefined
        });
        expect(htmlTemplate.cdnInfo.monaco.requirePaths).toEqual([
            {"cdn": undefined, "external": "vs/editor/editor.main"},
            {"cdn": undefined, "external": "vs/language/html/monaco.contribution"},
            {"cdn": undefined, "external": "vs/language/css/monaco.contribution"}]);
    });

    test("test monaco with CDN prefix", async () => {
        monacoEditorCorePackage = "monacoEditorCorePackage";
        monacoHtmlContribPackage = "monacoHtmlContribPackage";
        monacoCssContribPackage = "monacoCssContribPackage";
        monacoCdnPrefix = 'http://cdnPrefix/';
        
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.cdnInfo.monaco.vsLoader).toEqual({
            external: "./vs/original-loader.js",
            cdn: `http://cdnPrefix/${monacoEditorCorePackage}/min/vs/loader.js`
        });
        expect(htmlTemplate.cdnInfo.monaco.requirePaths).toEqual([
            {"cdn": `http://cdnPrefix/${monacoEditorCorePackage}/min/vs/editor/editor.main`, "external": "vs/editor/editor.main"},
            {"cdn": `http://cdnPrefix/${monacoHtmlContribPackage}/release/min/monaco.contribution`, "external": "vs/language/html/monaco.contribution"},
            {"cdn": `http://cdnPrefix/${monacoCssContribPackage}/release/min/monaco.contribution`, "external": "vs/language/css/monaco.contribution"}]);
    });

    test("test cdn.json file", async () => {
        cachedChunkRegexp = 'cachedChunk.*';
        cdnPrefix = 'http://cdnPrefix/';
        chunks = {
            chunk1: {
                entry: "cachedChunk1"
            },
            chunk2: {
                entry: "chunk2"
            }
        }
        
        cachedResourceRegexp = 'cachedResource.*';
        cdnPrefix = 'http://cdnPrefix/';
        assets = {
            "cachedResource1": {},
            "resource2": {},
            "vs/editor/editor.main.js": {},
            "vs/editor/editor.main.nls.js": {},
            "vs/editor/editor.main.css": {},
            "vs/language/html/monaco.contribution.js": {},
            "vs/language/css/monaco.contribution.js": {}
        };
        
        monacoEditorCorePackage = "monacoEditorCorePackage";
        monacoHtmlContribPackage = "monacoHtmlContribPackage";
        monacoCssContribPackage = "monacoCssContribPackage";
        monacoCdnPrefix = 'http://cdnPrefix/';
        
        buildTemplate();
        
        const cdnFile = 'lib/cdn.json';
        expect(fs.existsSync(cdnFile)).toBeTruthy();
        
        const contentCdnJson = await fs.readFile(cdnFile);
        const cdnJson = JSON.parse(contentCdnJson.toString());
        expect(cdnJson).toEqual([
            {"chunk": "cachedChunk1", "cdn": "http://cdnPrefix/cachedChunk1"},
            {"external": "vs/editor/editor.main.js", "cdn": "http://cdnPrefix/monacoEditorCorePackage/min/vs/editor/editor.main.js"},
            {"external": "vs/editor/editor.main.css","cdn": "http://cdnPrefix/monacoEditorCorePackage/min/vs/editor/editor.main.css"},
            {"external": "vs/editor/editor.main.nls.js", "cdn": "http://cdnPrefix/monacoEditorCorePackage/min/vs/editor/editor.main.nls.js"},
            {"external": "vs/language/html/monaco.contribution.js", "cdn": "http://cdnPrefix/monacoHtmlContribPackage/release/min/monaco.contribution.js"},
            {"external": "vs/language/css/monaco.contribution.js", "cdn": "http://cdnPrefix/monacoCssContribPackage/release/min/monaco.contribution.js"},
            {"external": "./vs/original-loader.js", "cdn": "http://cdnPrefix/monacoEditorCorePackage/min/vs/loader.js"},
            {"resource": "cachedResource1", "cdn": "http://cdnPrefix/cachedResource1"}
        ]);
    });
    
    test("test generateCdnScript", async () => {
        cachedChunkRegexp = 'cachedChunk.*';
        cdnPrefix = 'http://cdnPrefix/';
        chunks = {
            chunk1: {
                entry: "cachedChunk1"
            },
            chunk2: {
                entry: "chunk2"
            }
        }
        
        cachedResourceRegexp = 'cachedResource.*';
        cdnPrefix = 'http://cdnPrefix/';
        assets = {
            "cachedResource1": {},
            "resource2": {},
            "vs/editor/editor.main.js": {},
            "vs/editor/editor.main.nls.js": {},
            "vs/editor/editor.main.css": {},
            "vs/language/html/monaco.contribution.js": {},
            "vs/language/css/monaco.contribution.js": {}
        };
        
        monacoEditorCorePackage = "monacoEditorCorePackage";
        monacoHtmlContribPackage = "monacoHtmlContribPackage";
        monacoCssContribPackage = "monacoCssContribPackage";
        monacoCdnPrefix = 'http://cdnPrefix/';
        
        const htmlTemplate = buildTemplate();
        
        expect(htmlTemplate.generateCdnScript()).toBe(
"new CheCdnSupport({\"chunks\":[{\"chunk\":\"cachedChunk1\",\"cdn\":\"http://cdnPrefix/cachedChunk1\"}],\"resources\":[{\"resource\":\"cachedResource1\",\"cdn\":\"http://cdnPrefix/cachedResource1\"}],\"monaco\":{\"vsLoader\":{\"external\":\"./vs/original-loader.js\",\"cdn\":\"http://cdnPrefix/monacoEditorCorePackage/min/vs/loader.js\"},\"requirePaths\":[{\"external\":\"vs/editor/editor.main\",\"cdn\":\"http://cdnPrefix/monacoEditorCorePackage/min/vs/editor/editor.main\"},{\"external\":\"vs/language/html/monaco.contribution\",\"cdn\":\"http://cdnPrefix/monacoHtmlContribPackage/release/min/monaco.contribution\"},{\"external\":\"vs/language/css/monaco.contribution\",\"cdn\":\"http://cdnPrefix/monacoCssContribPackage/release/min/monaco.contribution\"}]}}).buildScripts();"
        );
    });
});

