/*********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { PortsPlugin } from './ports-plugin';

let portsPlugin: PortsPlugin | undefined;

export async function start(context: theia.PluginContext): Promise<void> {
    portsPlugin = new PortsPlugin(context);
    return portsPlugin.start();
}

export function stop(): void {
    if (portsPlugin) {
        portsPlugin.stop();
    }
}
