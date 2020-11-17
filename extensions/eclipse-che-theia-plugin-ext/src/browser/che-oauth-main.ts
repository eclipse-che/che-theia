/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheOauthMain } from '../common/che-protocol';
import { OauthUtils } from '@eclipse-che/theia-remote-api/lib/browser/oauth-utils';
import { interfaces } from 'inversify';

export class CheOauthMainImpl implements CheOauthMain {
  private readonly oAuthUtils: OauthUtils;

  constructor(container: interfaces.Container) {
    this.oAuthUtils = container.get(OauthUtils);
  }

  $getProviders(): Promise<string[]> {
    return this.oAuthUtils.getProviders();
  }

  $isAuthenticated(provider: string): Promise<boolean> {
    return this.oAuthUtils.isAuthenticated(provider);
  }
  $isRegistered(provider: string): Promise<boolean> {
    return this.oAuthUtils.isRegistered(provider);
  }
}
