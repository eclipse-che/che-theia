/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { HostedPluginProcess } from '@theia/plugin-ext/lib/hosted/node/hosted-plugin-process';
import * as cp from 'child_process';
import { LogType } from '@theia/plugin-ext/lib/common/types';
import { HostedPluginClient } from '@theia/plugin-ext/lib/common/plugin-protocol';

/**
 * Redirect extension host log to client
 */
export class LogHostedPluginProcess extends HostedPluginProcess {

    constructor() {
        super();
    }

    public runPluginServer(): void {
        super.runPluginServer();

        // grab childProcess and client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const childProcess: cp.ChildProcess = (this as any).childProcess;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client: HostedPluginClient = (this as any).client;

        if (childProcess) {
            if (childProcess.stdout) {
                childProcess.stdout.on('data', data => client.log({ data: `Extension-Host:${data.toString().trim()}`, type: LogType.Info }));
            }
            if (childProcess.stderr) {
                childProcess.stderr.on('data', data => client.log({ data: `Extension-Host:${data.toString().trim()}`, type: LogType.Error }));
            }
        }
    }

}
