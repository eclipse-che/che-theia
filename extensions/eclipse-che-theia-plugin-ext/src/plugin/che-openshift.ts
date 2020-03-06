/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, CheOpenshift, CheOpenshiftMain } from '../common/che-protocol';

export class CheOpenshiftImpl implements CheOpenshift {

    private readonly openshift: CheOpenshiftMain;

    constructor(rpc: RPCProtocol) {
        this.openshift = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_OPENSHIFT_MAIN);
    }

    getToken(): Promise<string> {
        return this.openshift.$getToken();
    }
}
