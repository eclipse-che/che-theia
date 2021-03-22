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

import { Configurations } from '../export/export-configs-manager';
import { TaskConfiguration } from '@eclipse-che/plugin';
import { injectable } from 'inversify';
import { parse } from '../utils';

/** Extracts vscode configurations of tasks. */
@injectable()
export class VsCodeTaskConfigsExtractor {
  extract(commands: che.devfile.DevfileCommand[]): Configurations<TaskConfiguration> {
    const emptyContent = { content: '', configs: [] } as Configurations<TaskConfiguration>;

    const configCommands = commands.filter(command => command.vscodeTask);
    if (configCommands.length === 0) {
      return emptyContent;
    }

    if (configCommands.length > 1) {
      console.warn(`Found duplicate entry with configurations for type vscodeTask`);
    }

    const configCommand = configCommands[0];
    if (!configCommand || !configCommand.vscodeTask?.inline) {
      return emptyContent;
    }

    const tasksContent = configCommand.vscodeTask.inline;
    const tasksJson = parse(tasksContent);
    if (!tasksJson || !tasksJson.tasks) {
      return emptyContent;
    }

    return { content: tasksContent, configs: tasksJson.tasks };
  }
}
