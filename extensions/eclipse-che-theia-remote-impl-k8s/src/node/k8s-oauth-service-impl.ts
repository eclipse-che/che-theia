/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { OAuthService } from '@eclipse-che/theia-remote-api/lib/common/oauth-service';
import { injectable } from 'inversify';

@injectable()
export class K8sOAuthServiceImpl implements OAuthService {
  public async getOAuthToken(oAuthProvider: string, userToken?: string): Promise<string | undefined> {
    throw new Error(`K8sOAuthServiceImpl.getOAuthToken(${oAuthProvider}, ${userToken}) is not supported`);
  }

  public async getOAuthProviders(userToken?: string): Promise<string[]> {
    throw new Error(`K8sOAuthServiceImpl.getOAuthProviders(${userToken}) is not supported`);
  }
}
