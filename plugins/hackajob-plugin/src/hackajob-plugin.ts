/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

export namespace Settings {
  export const CHE_CONFIGURATION = 'che';
  export const ACTIVATE_HACKAJOB_PLUGIN = 'hackajob.enable';
}

export async function handleHackajobUseCases(): Promise<void> {
  // Open the logs Task from the Tasks view
  await theia.commands.executeCommand('containers-plugin-run-task', 'Show logs', 'application');
}

export function start(context: theia.PluginContext): void {
  let activateHackajobPlugin: boolean | undefined = true;

  const configuration = theia.workspace.getConfiguration(Settings.CHE_CONFIGURATION);
  if (configuration) {
    activateHackajobPlugin = configuration.get(Settings.ACTIVATE_HACKAJOB_PLUGIN);
  }

  if (activateHackajobPlugin) {
    setTimeout(async () => {
      await handleHackajobUseCases();
    }, 2000);
  }
}

export function stop(): void {}
