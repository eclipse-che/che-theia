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

import { MiniBrowserEndpoint } from '@theia/mini-browser/lib/node/mini-browser-endpoint';
import { MiniBrowserEndpoint as MiniBrowserEndpointNS } from '@theia/mini-browser/lib/common/mini-browser-endpoint';
import { WorkspaceService } from '@eclipse-che/theia-remote-api/lib/common/workspace-service';
import { inject } from 'inversify';

export class CheMiniBrowserEndpoint extends MiniBrowserEndpoint {
  @inject(WorkspaceService)
  private workspaceService: WorkspaceService;

  protected async getVirtualHostRegExp(): Promise<RegExp> {
    const miniBrowserCheEndpoint = await this.workspaceService.findUniqueEndpointByAttribute(
      SERVER_TYPE_ATTR,
      SERVER_MINI_BROWSER_ATTR_VALUE
    );
    let miniBrowserCheEndpointHostname: string | undefined;
    if (miniBrowserCheEndpoint && miniBrowserCheEndpoint.url) {
      const url = new URL(miniBrowserCheEndpoint.url);
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
