/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/api/rpc-protocol';
import { Preferences } from '@eclipse-che/plugin';
import {
    CheUser,
    CheUserMain,
    PLUGIN_RPC_CONTEXT,
} from '../common/che-protocol';

export class CheUserImpl implements CheUser {

    private readonly userMain: CheUserMain;

    constructor(rpc: RPCProtocol) {
        this.userMain = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_USER_MAIN);
    }

    getUserPreferences(filter?: string): Promise<Preferences> {
        return this.userMain.$getUserPreferences(filter);
    }

    updateUserPreferences(update: Preferences): Promise<Preferences> {
        return this.userMain.$updateUserPreferences(update);
    }

    replaceUserPreferences(preferences: Preferences): Promise<Preferences> {
        return this.userMain.$replaceUserPreferences(preferences);
    }

    deleteUserPreferences(list?: string[]): Promise<void> {
        return this.userMain.$deleteUserPreferences(list);
    }

}
