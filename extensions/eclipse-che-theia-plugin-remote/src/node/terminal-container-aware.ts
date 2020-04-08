/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { TerminalServiceExtImpl } from '@theia/plugin-ext/lib/plugin/terminal-ext';
import { DebugExtImpl } from '@theia/plugin-ext/lib/plugin/node/debug/debug';
import { TerminalOptionsExt } from '@theia/plugin-ext';

/**
 * Allow to override createTerminal to be container-aware and then create terminal to the sidecar container
 */
export class TerminalContainerAware {

    /**
     * Intercept the original method by adding the CHE_MACHINE_NAME as attribute (if exists)
     */
    overrideTerminal(terminalServiceExt: TerminalServiceExtImpl): void {
        // bind createTerminal to the scope 'this' of the terminalServiceExt.
        const originalCreateTerminal = terminalServiceExt.createTerminal.bind(terminalServiceExt);

        const createTerminal = (nameOrOptions: theia.TerminalOptions | (string | undefined), shellPath?: string, shellArgs?: string[]) => {
            let options: theia.TerminalOptions;
            if (typeof nameOrOptions === 'object') {
                options = nameOrOptions;
            } else {
                options = {
                    name: nameOrOptions,
                    shellPath: shellPath,
                    shellArgs: shellArgs,
                    attributes: {}
                };
            }

            // add machine name if exists
            if (process.env.CHE_MACHINE_NAME) {
                if (!options.attributes) {
                    options.attributes = {};
                }
                options.attributes['CHE_MACHINE_NAME'] = process.env.CHE_MACHINE_NAME;
            }

            return originalCreateTerminal(options, shellPath, shellArgs);
        };

        // override terminal
        terminalServiceExt.createTerminal = createTerminal;
    }

    overrideTerminalCreationOptionForDebug(debugExt: DebugExtImpl): void {
        debugExt.doGetTerminalCreationOptions = (debugType: string) => {
            const options: TerminalOptionsExt = {
                attributes: {
                    'CHE_MACHINE_NAME': process.env.CHE_MACHINE_NAME!
                }
            };

            return Promise.resolve(options);
        };
    }
}
