/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import { parse, readFileSync } from '../utils';
import { Configurations } from '../export/export-configs-manager';
import { TaskConfiguration } from '@eclipse-che/plugin';

/** Extracts configurations of tasks from config file by given uri. */
@injectable()
export class ConfigFileTasksExtractor {

    extract(tasksConfigFileUri: string): Configurations<TaskConfiguration> {
        const tasksContent = readFileSync(tasksConfigFileUri);
        const tasksJson = parse(tasksContent);
        if (!tasksJson || !tasksJson.tasks) {
            return { content: '', configs: [] };
        }

        return { content: tasksContent, configs: tasksJson.tasks };
    }
}
