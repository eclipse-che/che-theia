/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { DebugExtImpl } from '@theia/plugin-ext/lib/plugin/node/debug/debug';
import { TerminalOptionsExt } from '@theia/plugin-ext';
import { TerminalServiceExtImpl } from '@theia/plugin-ext/lib/plugin/terminal-ext';

/**
 * Allow to override createTerminal to be container-aware and then create terminal to the sidecar container
 */
export class TerminalContainerAware {
  static readonly TERMINAL_COMPONENT_NAME = 'TERMINAL_COMPONENT_NAME';

  /**
   * Intercept the original method by adding the TERMINAL_COMPONENT_NAME as attribute (if exists)
   */
  overrideTerminal(terminalServiceExt: TerminalServiceExtImpl): void {
    // bind createTerminal to the scope 'this' of the terminalServiceExt.
    const originalCreateTerminal = terminalServiceExt.createTerminal.bind(terminalServiceExt);

    const createTerminal = (
      nameOrOptions: theia.TerminalOptions | (string | undefined),
      shellPath?: string,
      shellArgs?: string[]
    ) => {
      let options: theia.TerminalOptions;
      if (typeof nameOrOptions === 'object') {
        options = nameOrOptions;
      } else {
        options = {
          name: nameOrOptions,
          shellPath: shellPath,
          shellArgs: shellArgs,
          attributes: {},
        };
      }

      if (!options.attributes) {
        options.attributes = {};
      }
      this.addTerminalComponentAttribute(options.attributes);

      // add component name if exists
      return originalCreateTerminal(options, shellPath, shellArgs);
    };

    // override terminal
    terminalServiceExt.createTerminal = createTerminal;
  }

  overrideTerminalCreationOptionForDebug(debugExt: DebugExtImpl): void {
    const attributes = {};
    this.addTerminalComponentAttribute(attributes);
    debugExt.doGetTerminalCreationOptions = (debugType: string) => {
      const options: TerminalOptionsExt = {
        attributes,
      };
      return Promise.resolve(options);
    };
  }

  addTerminalComponentAttribute(attributes: { [key: string]: string | null }): void {
    if (process.env.DEVWORKSPACE_COMPONENT_NAME) {
      attributes[TerminalContainerAware.TERMINAL_COMPONENT_NAME] = process.env.DEVWORKSPACE_COMPONENT_NAME;
    } else if (process.env.CHE_MACHINE_NAME) {
      attributes[TerminalContainerAware.TERMINAL_COMPONENT_NAME] = process.env.CHE_MACHINE_NAME;
    }
  }
}
