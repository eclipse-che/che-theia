/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as che from '@eclipse-che/plugin';
import { CHE_TASK_TYPE } from '../task/task-protocol';

const cheTaskSchemaId = 'che://schemas/tasks';

const label = {
    type: 'string',
    description: 'A unique string that identifies the task'
};

const command = {
    type: 'string',
    description: 'A command line for execution'
};

const previewUrl = {
    type: 'string',
    description: 'A URL to access the running server'
};

const target = {
    type: 'object',
    description: 'A target for command execution',
    properties: {
        workingDir: {
            type: 'string',
            description: 'A directory in which the command is executed'
        },
        component: {
            type: 'string',
            description: 'A component in which the command is executed'
        }
    },
    additionalProperties: true
};

const cheTaskType = {
    type: 'string',
    enum: [CHE_TASK_TYPE],
    default: CHE_TASK_TYPE
};

export const CHE_TASK_SCHEMA: che.TaskJSONSchema = {
    $id: cheTaskSchemaId,
    type: 'object',
    required: ['type', 'label', 'command'],
    properties: {
        type: cheTaskType,
        label: label,
        command: command,
        target: target,
        previewUrl: previewUrl
    },
    additionalProperties: true
};
