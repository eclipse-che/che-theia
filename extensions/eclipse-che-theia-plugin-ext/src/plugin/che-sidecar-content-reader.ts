/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import * as fs from 'fs-extra';
import { URI } from 'vscode-uri';
import { CheSideCarContentReader, PLUGIN_RPC_CONTEXT } from '../common/che-protocol';

export class CheSideCarContentReaderImpl implements CheSideCarContentReader {
    constructor(rpc: RPCProtocol) {
        const delegate = rpc.getProxy(PLUGIN_RPC_CONTEXT.CHE_SIDERCAR_CONTENT_READER_MAIN);
        const machineName = process.env.CHE_MACHINE_NAME;
        if (machineName) {
            delegate.$registerContentReader(`file-sidecar-${machineName}`);
        }
    }

    async $read(uri: string, options?: { encoding?: string }): Promise<string | undefined> {

        const _uri = URI.parse(uri);
        if (fs.pathExistsSync(_uri.fsPath)) {
            return fs.readFileSync(_uri.fsPath, options).toString();
        }
    }
}
