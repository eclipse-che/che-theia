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

    async buildScripts(): Promise<void> {
        const entries = await Promise.all(this.info.chunks.map((entry: CdnChunk) => this.url(entry.cdn, entry.chunk)));

        entries.forEach((url: string) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.charset = 'utf-8';
            document!.head!.append(script);
        });
    }
    buildScriptsWithoutCdn(): Promise<void> {
        this.noCDN = true;
        return this.buildScripts();
    }
    url(withCDN: string | undefined, fallback: string): Promise<string> {
        if (this.noCDN || !withCDN) {
          return Promise.resolve(fallback);
        }

        const request = new XMLHttpRequest();
        request.open('HEAD', withCDN);

        return new Promise(resolve => {
            let timer = setTimeout(() => {
               resolve(fallback);
            }, 3000);
            request.onload = () => {
                  if (!timer) {
                     return;
                  }
                  clearTimeout(timer);
                  if (request.status >= 200 && request.status < 300 || request.status === 304) {
                      resolve(withCDN);
                  }
                  resolve(fallback);
            };
            request.send();
        });
    }
    async resourceUrl(path: string): Promise<string> {
        const cached = this.info.resources.find((entry) => entry.resource === path);
        if (!cached) {
            return path;
        }

        return this.url(cached.cdn, cached.resource);
    }
    async vsLoader(context: any): Promise<void> {
        const loaderURL = await this.url(this.info.monaco.vsLoader.cdn, this.info.monaco.vsLoader.external);
        const request = new XMLHttpRequest();

        request.open('GET', loaderURL);

        return new Promise(resolve => {
            let timer = setTimeout(() => {
                resolve();
            }, 10000);
            request.onload = () => {
                if (!timer) {
                    return;
                }
                clearTimeout(timer);
                if (request.status === 200) {
                    new Function(request.responseText).call(context);
                    if (this.info.monaco.vsLoader.cdn && loaderURL === this.info.monaco.vsLoader.cdn) {
                        const pathsWithCdns: any = {};
                        this.info.monaco.requirePaths
                            .forEach(async (path: CdnExternal) => {
                                const jsFile = path.external + '.js';
                                const jsCdnFile = path.cdn ? path.cdn + '.js' : undefined;
                                const url = await this.url(jsCdnFile, jsFile);
                                if (url === jsCdnFile) {
                                    pathsWithCdns[path.external] = path.cdn;
                                }
                            });
                        context.require.config({
                            paths: pathsWithCdns
                        });
                    }
                }
                resolve();
            };
            request.send();
        });
    }
}
