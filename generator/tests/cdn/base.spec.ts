/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { CheCdnSupport } from "../../src/cdn/base";

describe("Test CheCdnSupport", () => {
    const oldXMLHttpRequest = (<any>window).XMLHttpRequest;
    let mockXHR: any = null;
    let exampleCdnInfo: any;
    
    beforeEach(() => {
        mockXHR = {
            open: jest.fn(),
            send: () => {
            	mockXHR.onload();
            },
            readyState: 4,
            onload: jest.fn()
        };
        (<any>window).XMLHttpRequest = jest.fn(() => mockXHR);
        
        exampleCdnInfo = {
            chunks: [],
            resources: [],
            monaco: {
                vsLoader: {
                    external: 'vsLoaderExternal',
                    cdn: undefined
                },
                requirePaths: []
            }
        };
        
        const head = document!.head;
        while (head && head.firstChild) {
            head.removeChild(head.firstChild);
        }
    });

    afterEach(() => {
        (<any>window).XMLHttpRequest = oldXMLHttpRequest;
    });

    
    test("test webpackLoader when data", async () => {
        expect(CheCdnSupport.webpackLoader('module.exports = "data:someData"')).toEqual('module.exports = "data:someData"');
        expect(CheCdnSupport.webpackLoader('module.exports="data:someData"')).toEqual('module.exports="data:someData"');
    });
    
    test("test webpackLoader when file or url", async () => {
        expect(CheCdnSupport.webpackLoader('module.exports = anyNonDataValue;')).toEqual('module.exports = window.CheCdnSupport.instance.resourceUrl(anyNonDataValue);');
        expect(CheCdnSupport.webpackLoader('module.exports=anyNonDataValue;')).toEqual('module.exports = window.CheCdnSupport.instance.resourceUrl(anyNonDataValue);');
    });
    
    test("test webpackLoader when file or url", async () => {
        expect(CheCdnSupport.webpackLoader('module.exports = anyNonDataValue;')).toEqual('module.exports = window.CheCdnSupport.instance.resourceUrl(anyNonDataValue);');
        expect(CheCdnSupport.webpackLoader('module.exports=anyNonDataValue;')).toEqual('module.exports = window.CheCdnSupport.instance.resourceUrl(anyNonDataValue);');
    });
    
    test('test url method when HEAD is OK and cdn is enabled', async () => {
        mockXHR.status = 200;
        expect(new CheCdnSupport(exampleCdnInfo).url('withCDN', 'fallback'))
        .toBe('withCDN');
    });

    test('test url method when HEAD is not OK and cdn is enabled', async () => {
        mockXHR.status = 404;
        expect(new CheCdnSupport(exampleCdnInfo).url('withCDN', 'fallback'))
        .toBe('fallback');
    });

    test('test url method when HEAD is 304 and cdn is enabled', async () => {
        mockXHR.status = 304;
        expect(new CheCdnSupport(exampleCdnInfo).url('withCDN', 'fallback'))
        .toBe('withCDN');
    });
    
    test('test url method when HEAD is OK and cdn is disabled', async () => {
        mockXHR.status = 200;
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        cdnSupport.noCDN = true;
        expect(cdnSupport.url('withCDN', 'fallback'))
        .toBe('fallback');
    });

    test('test register', async () => {
        const context: any = {};
        CheCdnSupport.register(context);
        expect(context.CheCdnSupport)
        .toBe(CheCdnSupport);
    });
    
    test('test buildScripts when cdn is enabled', async () => {
        mockXHR.status = 200;
        exampleCdnInfo.chunks = [{
            chunk: "http://chunk1/",
            cdn: "http://cdn1/"
        },{
            chunk: "http://chunk2/",
            cdn: undefined
        }];
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        cdnSupport.buildScripts();
        expect(document!.head!.children!.length).toBe(2);
        
        var child: any = document!.head!.children![0];
        expect(child.async).toBe(true);
        expect(child.defer).toBe(true);
        expect(child.crossOrigin).toBe('anonymous');
        expect(child.charset).toBe('utf-8');
        expect(child.src).toBe('http://cdn1/');
        
        child = document!.head!.children![1];
        expect(child.async).toBe(true);
        expect(child.defer).toBe(true);
        expect(child.crossOrigin).toBe('anonymous');
        expect(child.charset).toBe('utf-8');
        expect(child.src).toBe('http://chunk2/');
    });

    test('test buildScripts when cdn is disabled', async () => {
        mockXHR.status = 200;
        exampleCdnInfo.chunks = [{
            chunk: "http://chunk1",
            cdn: "http://cdn1"
        },{
            chunk: "http://chunk2",
            cdn: undefined
        }];
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        cdnSupport.noCDN = true;
        cdnSupport.buildScripts();
        expect(document!.head!.children!.length).toBe(2);
        
        var child: any = document!.head!.children![0];
        expect(child.async).toBe(true);
        expect(child.defer).toBe(true);
        expect(child.crossOrigin).toBe('anonymous');
        expect(child.charset).toBe('utf-8');
        expect(child.src).toBe('http://chunk1/');
        
        child = document!.head!.children![1];
        expect(child.async).toBe(true);
        expect(child.defer).toBe(true);
        expect(child.crossOrigin).toBe('anonymous');
        expect(child.charset).toBe('utf-8');
        expect(child.src).toBe('http://chunk2/');
    });
    
    test('test buildScriptsWithoutCdn', async () => {
        mockXHR.status = 200;
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        cdnSupport.buildScriptsWithoutCdn();
        expect(cdnSupport.noCDN).toBe(true);
    });

    test('test resourceUrl method', async () => {
        mockXHR.status = 200;
        exampleCdnInfo.resources = [{
            resource: "http://resource1",
            cdn: "http://cdn1"
        },{
        	resource: "http://resource2",
            cdn: undefined
        }];
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        expect(cdnSupport.resourceUrl('http://resource1'))
        .toBe('http://cdn1');
        expect(cdnSupport.resourceUrl('http://resource2'))
        .toBe('http://resource2');
        expect(cdnSupport.resourceUrl('http://resource3'))
        .toBe('http://resource3');
    });

    test('test vsLoader with no CDN', async () => {
        mockXHR.status = 200;
        const context: any = {};
        
        mockXHR.responseText = `
        theGlobal = this;
        theGlobal.require = {
            config: function(conf) {
                theGlobal.requireConfigPaths = conf.paths;
            }
        }
        `;
        
        exampleCdnInfo.monaco.requirePaths = [{
            external: "http://external1",
            cdn: "http://cdn1"
        },{
            resource: "http://external2",
            cdn: undefined
        }];
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        cdnSupport.vsLoader(context);
        expect(context.requireConfigPaths)
        .toBe(undefined);
    });
    
    test('test vsLoader with CDN', async () => {
        mockXHR.status = 200;
        const context: any = {};
        
        mockXHR.responseText = `
        theGlobal = this;
        theGlobal.require = {
            config: function(conf) {
                theGlobal.requireConfigPaths = conf.paths;
            }
        }
        `;
        
        exampleCdnInfo.monaco.vsLoader.cdn = "http://vsloaderCDN/"
        exampleCdnInfo.monaco.requirePaths = [{
            external: "http://external1",
            cdn: "http://cdn1"
        },{
            resource: "http://external2",
            cdn: undefined
        }];
        const cdnSupport = new CheCdnSupport(exampleCdnInfo);
        cdnSupport.vsLoader(context);
        expect(context.requireConfigPaths)
        .toEqual({"http://external1": "http://cdn1"});
    });

});
