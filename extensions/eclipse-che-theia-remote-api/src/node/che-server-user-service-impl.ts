/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Preferences, User, UserService } from '../common/user-service';
import { inject, injectable } from 'inversify';

import { CheServerRemoteApiImpl } from './che-server-remote-api-impl';

@injectable()
export class CheServerUserServiceImpl implements UserService {
  @inject(CheServerRemoteApiImpl)
  private cheServerRemoteApiImpl: CheServerRemoteApiImpl;

  async getUserId(userToken?: string): Promise<string> {
    const user = await this.cheServerRemoteApiImpl.getAPI(userToken).getCurrentUser();
    return user.id;
  }

  getCurrentUser(userToken?: string): Promise<User> {
    return this.cheServerRemoteApiImpl.getAPI(userToken).getCurrentUser();
  }

  getUserPreferences(filter?: string): Promise<Preferences> {
    return this.cheServerRemoteApiImpl.getAPI().getUserPreferences(filter);
  }

  updateUserPreferences(update: Preferences): Promise<Preferences> {
    return this.cheServerRemoteApiImpl.getAPI().updateUserPreferences(update);
  }

  replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
    return this.cheServerRemoteApiImpl.getAPI().replaceUserPreferences(preferences);
  }

  deleteUserPreferences(list?: string[]): Promise<void> {
    return this.cheServerRemoteApiImpl.getAPI().deleteUserPreferences(list);
  }
}
