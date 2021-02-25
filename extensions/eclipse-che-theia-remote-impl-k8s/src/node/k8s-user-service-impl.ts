/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Preferences, User, UserService } from '@eclipse-che/theia-remote-api/lib/common/user-service';

import { injectable } from 'inversify';

@injectable()
export class K8sUserServiceImpl implements UserService {
  private preferences: { [key: string]: string } = {};

  async getUserId(userToken?: string): Promise<string> {
    return 'unknown';
  }

  async getCurrentUser(userToken?: string): Promise<User> {
    return { id: 'unknown', name: 'unknown' };
  }

  async getUserPreferences(filter?: string): Promise<Preferences> {
    return this.preferences;
  }

  async updateUserPreferences(update: Preferences): Promise<Preferences> {
    Object.keys(update).forEach(key => {
      this.preferences[key] = update[key];
    });
    return update;
  }

  async replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
    this.preferences = preferences;
    return preferences;
  }

  async deleteUserPreferences(list?: string[]): Promise<void> {
    (list || []).forEach(key => {
      delete this.preferences[key];
    });
  }
}
