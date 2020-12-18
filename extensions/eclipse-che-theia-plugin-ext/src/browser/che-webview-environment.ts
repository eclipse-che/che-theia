/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { SERVER_TYPE_ATTR, SERVER_WEBVIEWS_ATTR_VALUE } from '../common/che-server-common';
import { inject, injectable, postConstruct } from 'inversify';

import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import URI from '@theia/core/lib/common/uri';
import { WebviewEnvironment } from '@theia/plugin-ext/lib/main/browser/webview/webview-environment';
import { WebviewExternalEndpoint } from '@theia/plugin-ext/lib/main/common/webview-protocol';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

@injectable()
export class CheWebviewEnvironment extends WebviewEnvironment {
  @inject(EnvVariablesServer)
  protected readonly environments: EnvVariablesServer;

  @inject(WorkspaceService)
  private workspaceService: WorkspaceService;

  @postConstruct()
  protected async init(): Promise<void> {
    try {
      const webviewExternalEndpointPattern = await this.environments.getValue(WebviewExternalEndpoint.pattern);
      const webviewCheEndpoint = await this.getWebviewCheEndpoint();
      const webviewHost =
        (webviewExternalEndpointPattern && webviewExternalEndpointPattern.value) ||
        webviewCheEndpoint ||
        WebviewExternalEndpoint.defaultPattern;
      this.externalEndpointHost.resolve(webviewHost.replace('{{hostname}}', window.location.host || 'localhost'));
    } catch (e) {
      this.externalEndpointHost.reject(e);
    }
  }

  async externalEndpointUrl(): Promise<URI> {
    const host = await this.externalEndpointHost.promise;
    return new URI(host).resolve('webview');
  }

  protected async getWebviewCheEndpoint(): Promise<string | undefined> {
    try {
      const webviewCheEndpoint = await this.workspaceService.findUniqueEndpointByAttribute(
        SERVER_TYPE_ATTR,
        SERVER_WEBVIEWS_ATTR_VALUE
      );
      return webviewCheEndpoint.url;
    } catch (error) {
      return undefined;
    }
  }
}
