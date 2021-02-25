/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, postConstruct } from 'inversify';

import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { MiniBrowserEndpoint } from '@theia/mini-browser/lib/common/mini-browser-endpoint';
import { MiniBrowserEnvironment } from '@theia/mini-browser/lib/browser/environment/mini-browser-environment';
import { SERVER_MINI_BROWSER_ATTR_VALUE } from '@eclipse-che/theia-plugin-ext/lib/common/che-server-common';

export class CheMiniBrowserEnvironment extends MiniBrowserEnvironment {
  @inject(EndpointService)
  private endpointService: EndpointService;

  @postConstruct()
  protected async postConstruct(): Promise<void> {
    const miniBrowserExternalEndpointPattern = await this.environment.getValue(MiniBrowserEndpoint.HOST_PATTERN_ENV);

    const miniBrowserCheEndpoints = await this.endpointService.getEndpointsByType(SERVER_MINI_BROWSER_ATTR_VALUE);
    if (!miniBrowserCheEndpoints || miniBrowserCheEndpoints.length !== 1) {
      throw new Error(`Find too many ${SERVER_MINI_BROWSER_ATTR_VALUE} endpoints`);
    }
    const miniBrowserCheEndpoint = miniBrowserCheEndpoints[0];
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
