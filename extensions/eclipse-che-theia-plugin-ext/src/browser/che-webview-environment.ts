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
        try {
            const webviewExternalEndpointPattern = await this.environments.getValue(WebviewExternalEndpoint.pattern);
            const webviewServer = await this.cheApi.findUniqueServerByAttribute(SERVER_TYPE_ATTR, SERVER_WEBVIEWS_ATTR_VALUE);
            let webviewDomain: string | undefined;
            if (webviewServer && webviewServer.url) {
                webviewDomain = getUrlDomain(webviewServer.url);
            }
            const hostName = webviewExternalEndpointPattern && webviewExternalEndpointPattern.value || webviewDomain || WebviewExternalEndpoint.pattern;
            this.externalEndpointHost.resolve(hostName.replace('{{hostname}}', window.location.host || 'localhost'));
        } catch (e) {
            this.externalEndpointHost.reject(e);
        }
    }
}
