/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';

import { Configurations } from '../export/export-configs-manager';
import { injectable } from 'inversify';
import { parse } from '../utils';

/** Extracts vscode launch configurations. */
@injectable()
export class VsCodeLaunchConfigsExtractor {
  extract(commands: che.devfile.DevfileCommand[]): Configurations<theia.DebugConfiguration> {
    const emptyContent: Configurations<theia.DebugConfiguration> = { content: '', configs: [] };

    const configCommands = commands.filter(command => command.vscodeLaunch);
    if (configCommands.length === 0) {
      return emptyContent;
    }

    if (configCommands.length > 1) {
      console.warn(`Found duplicate entry with configurations for type vscodeLaunch`);
    }

    const configCommand = configCommands[0];
    if (!configCommand || !configCommand.vscodeLaunch?.inline) {
      return emptyContent;
    }

    const launchConfigsContent = configCommand.vscodeLaunch.inline;
    const configsJson = parse(launchConfigsContent);
    if (!configsJson || !configsJson.configurations) {
      return emptyContent;
    }

    return { content: launchConfigsContent, configs: configsJson.configurations };
  }
}
