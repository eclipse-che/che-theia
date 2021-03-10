/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { EndpointService } from '@eclipse-che/theia-remote-api/lib/common/endpoint-service';
import { HostedPluginUriPostProcessor } from '@theia/plugin-dev';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class CheWorkspaceHostedPluginUriPostProcessor implements HostedPluginUriPostProcessor {
  @inject(EndpointService)
  protected endpointService: EndpointService;

  constructor() {}

  async processUri(uri: URI): Promise<URI> {
    const ideDevEndpoints = await this.endpointService.getEndpointsByType('ide-dev');
    if (ideDevEndpoints.length !== 1) {
      throw new Error(`Should have only one ide-dev endpoint but found ${JSON.stringify(ideDevEndpoints)}`);
    }
    const hostedPluginExposedEndpoint = ideDevEndpoints[0];
    return new URI(hostedPluginExposedEndpoint.url);
  }

  async processOptions(options: object): Promise<object> {
    return options;
  }
}
