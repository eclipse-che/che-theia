/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject, postConstruct } from 'inversify';
import { CheApiService } from '../common/che-protocol';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import URI from '@theia/core/lib/common/uri';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { WebviewEnvironment } from '@theia/plugin-ext/lib/main/browser/webview/webview-environment';
import { WebviewExternalEndpoint } from '@theia/plugin-ext/lib/main/common/webview-protocol';
import { getUrlDomain, SERVER_TYPE_ATTR, SERVER_WEBVIEWS_ATTR_VALUE } from '../common/che-server-common';

@injectable()
export class CheWebviewEnvironment extends WebviewEnvironment {

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    @inject(CheApiService)
    private cheApi: CheApiService;

    @postConstruct()
    protected async init(): Promise<void> {
        let webviewDomain: string | undefined;
        try {
            const webviewExternalEndpointPattern = await this.environments.getValue(WebviewExternalEndpoint.pattern);
            const webviewServer = await this.cheApi.findUniqueServerByAttribute(SERVER_TYPE_ATTR, SERVER_WEBVIEWS_ATTR_VALUE);
            if (webviewServer && webviewServer.url) {
                webviewDomain = getUrlDomain(webviewServer.url);
            }
            const hostName = webviewExternalEndpointPattern && webviewExternalEndpointPattern.value || webviewDomain || WebviewExternalEndpoint.pattern;
            this.externalEndpointHost.resolve(hostName.replace('{{hostname}}', window.location.host || 'localhost'));
        } catch (e) {
            this.externalEndpointHost.reject(e);
        }

        if (webviewDomain) {
            this.obtainWebviewEndpointCookie(webviewDomain);
        }
    }

    /**
     * Loads webview endpoint to have auth cookie set for the endpoint,
     * so the following requests won't be redirected to loader.
     *
     * This is workaround to make webviews work on another endpoint.
     * Otherwise it will retreive loader instead of requested resource.
     */
    private async obtainWebviewEndpointCookie(webviewDomain: string): Promise<void> {
        // Still doesn't work. See https://github.com/eclipse/che/issues/15283#issuecomment-565344427
        console.log('>>>>>>>>>>>>>>>>>>>>>', webviewDomain);
        const requestIFrame = document.createElement('iframe');
        requestIFrame.style.display = 'none';
        // requestIFrame.width = '0';
        // requestIFrame.height = '0';
        requestIFrame.id = 'test-query-iframe';
        requestIFrame.src = webviewDomain;
        // requestIFrame.onload = () => requestIFrame.remove();
        document.body.appendChild(requestIFrame);
    }

    /**
     * Reconfigures webviews from /webview to / path.
     * After fixing of https://github.com/eclipse/che/issues/15430 and https://github.com/eclipse/che/issues/15410 would be
     *   good to return to upstream configuration in order to have less difference with it.
     */
    async externalEndpointUrl(): Promise<URI> {
        const host = await this.externalEndpointHost.promise;
        return new Endpoint({
            host,
            path: '/'
        }).getRestUrl();
    }

}
