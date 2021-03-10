/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { parse, readFile } from '../utils';

import { Configurations } from '../export/export-configs-manager';
import { TaskConfiguration } from '@eclipse-che/plugin';
import { injectable } from 'inversify';

/** Extracts configurations of tasks from config file by given uri. */
@injectable()
export class ConfigFileTasksExtractor {
  async extract(tasksConfigFileUri: string): Promise<Configurations<TaskConfiguration>> {
    const tasksContent = await readFile(tasksConfigFileUri);
    const tasksJson = parse(tasksContent);
    if (!tasksJson || !tasksJson.tasks) {
      return { content: '', configs: [] };
    }

    return { content: tasksContent, configs: tasksJson.tasks };
  }
}
