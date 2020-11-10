/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { User, UserService } from '@eclipse-che/theia-remote-api/lib/common/user-service';

import { CheUserMain } from '../common/che-protocol';
import { OauthUtils } from '@eclipse-che/theia-remote-api/lib/browser/oauth-utils';
import { Preferences } from '@eclipse-che/plugin';
import { interfaces } from 'inversify';

export class CheUserMainImpl implements CheUserMain {
  private readonly userService: UserService;
  private readonly oAuthUtils: OauthUtils;

  constructor(container: interfaces.Container) {
    this.userService = container.get(UserService);
    this.oAuthUtils = container.get(OauthUtils);
  }

  async $getCurrentUser(): Promise<User> {
    return this.userService.getCurrentUser(await this.oAuthUtils.getUserToken());
  }

  $getUserPreferences(filter?: string): Promise<Preferences> {
    return this.userService.getUserPreferences(filter);
  }

  $updateUserPreferences(preferences: Preferences): Promise<Preferences> {
    return this.userService.updateUserPreferences(preferences);
  }

  $replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
    return this.userService.replaceUserPreferences(preferences);
  }

  $deleteUserPreferences(list?: string[]): Promise<void> {
    return this.userService.deleteUserPreferences(list);
  }
}
