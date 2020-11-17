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

import { Configurations } from '../export/export-configs-manager';
import { che as cheApi } from '@eclipse-che/api';
import { injectable } from 'inversify';
import { parse } from '../utils';

export const VSCODE_LAUNCH_TYPE = 'vscode-launch';

/** Extracts vscode launch configurations. */
@injectable()
export class VsCodeLaunchConfigsExtractor {
  extract(commands: cheApi.workspace.Command[]): Configurations<theia.DebugConfiguration> {
    const emptyContent: Configurations<theia.DebugConfiguration> = { content: '', configs: [] };

    const configCommands = commands.filter(command => command.type === VSCODE_LAUNCH_TYPE);
    if (configCommands.length === 0) {
      return emptyContent;
    }

    if (configCommands.length > 1) {
      console.warn(`Found duplicate entry with configurations for type ${VSCODE_LAUNCH_TYPE}`);
    }

    const configCommand = configCommands[0];
    if (!configCommand || !configCommand.attributes || !configCommand.attributes.actionReferenceContent) {
      return emptyContent;
    }

    const launchConfigsContent = configCommand.attributes.actionReferenceContent;
    const configsJson = parse(launchConfigsContent);
    if (!configsJson || !configsJson.configurations) {
      return emptyContent;
    }

    return { content: launchConfigsContent, configs: configsJson.configurations };
  }
}
