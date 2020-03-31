/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

export interface Extension {
    name: string;
}

export interface CdnArtifact {
    cdn: string | undefined;
}

export interface CdnResource extends CdnArtifact {
    resource: string;
}

export interface CdnChunk extends CdnArtifact {
    chunk: string;
}

export interface CdnExternal extends CdnArtifact {
    external: string;
}

export interface MonacoCdnSupport {
    vsLoader: CdnExternal;
    requirePaths: CdnExternal[];
}

export interface CdnInfo {
    chunks: CdnChunk[];
    resources: CdnResource[];
    monaco: MonacoCdnSupport;
}

export class CheCdnSupport {
    static readonly className = 'CheCdnSupport';

    static instance: CheCdnSupport;

    static register(context: any) {
        context[CheCdnSupport.className] = CheCdnSupport;
    }

    static webpackLoader(source: string) {
        if (source.match(/^module\.exports ?\= ?"data:/)) {
            return source;
        }
        const urlContent = source.replace(/^module\.exports ?\= ?([^;]+);$/, '$1');
        return `module.exports = window.${CheCdnSupport.className}.instance.resourceUrl(${urlContent});`;
    }

    constructor(private info: CdnInfo) {
        CheCdnSupport.instance = this;
    }

    noCDN: boolean = false;

    buildScripts(): void {
        this.info.chunks.map((entry: CdnChunk) => this.url(entry.cdn, entry.chunk))
            .forEach((url: string) => {
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.defer = true;
                script.crossOrigin = 'anonymous';
                script.charset = 'utf-8';
                document!.head!.append(script);
            });
    }
    buildScriptsWithoutCdn(): void {
        this.noCDN = true;
        this.buildScripts();
    }
    url(withCDN: string | undefined, fallback: string): string {
        let result = fallback;
        if (!this.noCDN && withCDN) {
            const request = new XMLHttpRequest();
            request.onload = function() {
                if (this.status >= 200 && this.status < 300 || this.status === 304) {
                    result = withCDN;
                }
            };
            try {
                request.open('HEAD', withCDN, false);
                request.send();
            } catch (err) {
                console.log(`Error trying to access the CDN artifact '${withCDN}' : ${err}`);
                this.noCDN = true;
            }
        }
        return result;
    }
    resourceUrl(path: string): string {
        const cached = this.info.resources.find((entry) => entry.resource === path);
        if (cached) {
            return this.url(cached.cdn, cached.resource);
        }
        return path;
    }
    vsLoader(context: any): void {
        const loaderURL = this.url(this.info.monaco.vsLoader.cdn, this.info.monaco.vsLoader.external);
        const request = new XMLHttpRequest();
        request.open('GET', loaderURL, false);
        request.send();
        new Function(request.responseText).call(context);
        if (this.info.monaco.vsLoader.cdn && loaderURL === this.info.monaco.vsLoader.cdn) {
            const pathsWithCdns: any = {};
            this.info.monaco.requirePaths
                .forEach((path: CdnExternal) => {
                    const jsFile = path.external + '.js';
                    const jsCdnFile = path.cdn ? path.cdn + '.js' : undefined;
                    if (this.url(jsCdnFile, jsFile) === jsCdnFile) {
                        pathsWithCdns[path.external] = path.cdn;
                    }
                });
            context.require.config({
                paths: pathsWithCdns
            });
        }
    }
}
