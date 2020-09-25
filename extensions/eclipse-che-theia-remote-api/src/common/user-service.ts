/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che } from '@eclipse-che/api';

export const cheUserServicePath = '/services/che-user-service';

export const UserService = Symbol('UserService');

export interface User extends che.user.User {
    id: string;
    name: string;
}

export interface Preferences {
    [key: string]: string;
}

export interface UserService {

    /** @deprecated use {@link getCurrentUser} instead. */
    getUserId(userToken?: string): Promise<string>;
    getCurrentUser(userToken?: string): Promise<User>;
    getUserPreferences(): Promise<Preferences>;
    getUserPreferences(filter: string | undefined): Promise<Preferences>;
    updateUserPreferences(update: Preferences): Promise<Preferences>;
    replaceUserPreferences(preferences: Preferences): Promise<Preferences>;
    deleteUserPreferences(): Promise<void>;
    deleteUserPreferences(list: string[] | undefined): Promise<void>;

}
