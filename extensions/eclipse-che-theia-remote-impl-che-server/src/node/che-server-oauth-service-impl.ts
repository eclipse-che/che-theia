/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';
import { OAuthService } from '@eclipse-che/theia-remote-api/lib/common/oauth-service';

@injectable()
export class CheServerOAuthServiceImpl implements OAuthService {
  @inject(CheServerRemoteApiImpl)
  private cheServerRemoteApiImpl: CheServerRemoteApiImpl;

  public async getOAuthToken(oAuthProvider: string, userToken?: string): Promise<string | undefined> {
    return this.cheServerRemoteApiImpl.getAPI(userToken).getOAuthToken(oAuthProvider);
  }

  public async getOAuthProviders(userToken?: string): Promise<string[]> {
    return this.cheServerRemoteApiImpl.getAPI(userToken).getOAuthProviders();
  }
}
