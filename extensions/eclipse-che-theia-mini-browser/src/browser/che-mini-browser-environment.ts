/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  SERVER_MINI_BROWSER_ATTR_VALUE,
  SERVER_TYPE_ATTR,
} from '@eclipse-che/theia-plugin-ext/lib/common/che-server-common';
import { inject, postConstruct } from 'inversify';

import { MiniBrowserEndpoint } from '@theia/mini-browser/lib/common/mini-browser-endpoint';
import { MiniBrowserEnvironment } from '@theia/mini-browser/lib/browser/environment/mini-browser-environment';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';

export class CheMiniBrowserEnvironment extends MiniBrowserEnvironment {
  @inject(WorkspaceService)
  private workspaceService: WorkspaceService;

  @postConstruct()
  protected async postConstruct(): Promise<void> {
    const miniBrowserExternalEndpointPattern = await this.environment.getValue(MiniBrowserEndpoint.HOST_PATTERN_ENV);

    const miniBrowserCheEndpoint = await this.workspaceService.findUniqueEndpointByAttribute(
      SERVER_TYPE_ATTR,
      SERVER_MINI_BROWSER_ATTR_VALUE
    );

    let miniBrowserCheEndpointHostname: string | undefined;
    if (miniBrowserCheEndpoint && miniBrowserCheEndpoint.url) {
      const miniBrowserCheEndpointURL = new URL(miniBrowserCheEndpoint.url);
      miniBrowserCheEndpointHostname = miniBrowserCheEndpointURL.hostname;
    }

    const miniBrowserHostName =
      (miniBrowserExternalEndpointPattern && miniBrowserExternalEndpointPattern.value) ||
      miniBrowserCheEndpointHostname ||
      MiniBrowserEndpoint.HOST_PATTERN_DEFAULT;

    this._hostPatternPromise = Promise.resolve(miniBrowserHostName);
  }
}
