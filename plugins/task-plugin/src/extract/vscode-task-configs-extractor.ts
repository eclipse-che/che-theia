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
import { che as cheApi } from '@eclipse-che/api';
import { parse } from '../utils';
import { Configurations } from '../export/export-configs-manager';
import { TaskConfiguration } from '@eclipse-che/plugin';

export const VSCODE_TASK_TYPE = 'vscode-task';

/** Extracts vscode configurations of tasks. */
@injectable()
export class VsCodeTaskConfigsExtractor {

    extract(commands: cheApi.workspace.Command[]): Configurations<TaskConfiguration> {
        const emptyContent = { content: '', configs: [] } as Configurations<TaskConfiguration>;

        const configCommands = commands.filter(command => command.type === VSCODE_TASK_TYPE);
        if (configCommands.length === 0) {
            return emptyContent;
        }

        if (configCommands.length > 1) {
            console.warn(`Found duplicate entry with configurations for type ${VSCODE_TASK_TYPE}`);
        }

        const configCommand = configCommands[0];
        if (!configCommand || !configCommand.attributes || !configCommand.attributes.actionReferenceContent) {
            return emptyContent;
        }

        const tasksContent = configCommand.attributes.actionReferenceContent;
        const tasksJson = parse(tasksContent);
        if (!tasksJson || !tasksJson.tasks) {
            return emptyContent;
        }

        return { content: tasksContent, configs: tasksJson.tasks };
    }
}
