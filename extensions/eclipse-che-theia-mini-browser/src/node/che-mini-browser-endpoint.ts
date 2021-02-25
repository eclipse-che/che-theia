/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { MiniBrowserEndpoint } from '@theia/mini-browser/lib/node/mini-browser-endpoint';
import { MiniBrowserEndpoint as MiniBrowserEndpointNS } from '@theia/mini-browser/lib/common/mini-browser-endpoint';
import { SERVER_MINI_BROWSER_ATTR_VALUE } from '@eclipse-che/theia-plugin-ext/lib/common/che-server-common';
import { inject } from 'inversify';

export class CheMiniBrowserEndpoint extends MiniBrowserEndpoint {
  @inject(EndpointService)
  private endpointService: EndpointService;

  protected async getVirtualHostRegExp(): Promise<RegExp> {
    const endpoints = await this.endpointService.getEndpointsByType(SERVER_MINI_BROWSER_ATTR_VALUE);

    let miniBrowserCheEndpointHostname: string | undefined;
    if (endpoints.length === 1 && endpoints[0].url) {
      const url = new URL(endpoints[0].url);
      miniBrowserCheEndpointHostname = url.hostname;
    }
    const pattern =
      process.env[MiniBrowserEndpointNS.HOST_PATTERN_ENV] ??
      miniBrowserCheEndpointHostname ??
      MiniBrowserEndpointNS.HOST_PATTERN_DEFAULT;
    const vhostRe = pattern.replace('.', '\\.').replace('{{uuid}}', '.+').replace('{{hostname}}', '.+');
    return new RegExp(vhostRe, 'i');
  }
}
