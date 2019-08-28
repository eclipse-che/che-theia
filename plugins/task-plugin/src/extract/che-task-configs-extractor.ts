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
import { TaskConfiguration } from '@eclipse-che/plugin';
import { toTaskConfiguration } from '../task/converter';
import { VSCODE_TASK_TYPE } from './vscode-task-configs-extractor';
import { VSCODE_LAUNCH_TYPE } from './vscode-launch-configs-extractor';

/** Extracts CHE configurations of tasks. */
@injectable()
export class CheTaskConfigsExtractor {

    extract(commands: cheApi.workspace.Command[]): TaskConfiguration[] {
        // TODO filter should be changed according to task type after resolving https://github.com/eclipse/che/issues/12710
        const filteredCommands = commands.filter(command =>
            command.type !== VSCODE_TASK_TYPE &&
            command.type !== VSCODE_LAUNCH_TYPE);

        if (filteredCommands.length === 0) {
            return [];
        }

        return filteredCommands.map(command => toTaskConfiguration(command));
    }
}
