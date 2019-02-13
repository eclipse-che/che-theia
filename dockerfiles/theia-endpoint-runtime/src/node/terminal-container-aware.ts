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
import { TerminalServiceExtImpl } from '@theia/plugin-ext/src/plugin/terminal-ext';

/**
 * Allow to override createTerminal to be container-aware and then create terminal to the sidecar container
 */
export class TerminalContainerAware {

    /**
     * Intercept the original method by adding the CHE_MACHINE_NAME as attribute (if exists)
     */
    overrideTerminal(terminalServiceExt: TerminalServiceExtImpl) {
        const originalCreateTerminal = terminalServiceExt.createTerminal;
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
}
