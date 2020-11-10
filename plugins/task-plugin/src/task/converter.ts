/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  CHE_TASK_TYPE,
  COMPONENT_ALIAS_ATTRIBUTE,
  PREVIEW_URL_ATTRIBUTE,
  WORKING_DIR_ATTRIBUTE,
} from './task-protocol';

import { Task } from '@theia/plugin';
import { TaskConfiguration } from '@eclipse-che/plugin';
import { che as cheApi } from '@eclipse-che/api';
import { getAttribute } from '../utils';

/** Converts the Che command to Theia Task Configuration */
export function toTaskConfiguration(command: cheApi.workspace.Command): TaskConfiguration {
  const taskConfig: TaskConfiguration = {
    type: CHE_TASK_TYPE,
    label: command.name!,
    command: command.commandLine,
    _scope: '', // not to put into tasks.json
    target: {
      workingDir: getAttribute(WORKING_DIR_ATTRIBUTE, command.attributes),
      component: getAttribute(COMPONENT_ALIAS_ATTRIBUTE, command.attributes),
    },
    previewUrl: getAttribute(PREVIEW_URL_ATTRIBUTE, command.attributes),
    problemMatcher: [],
  };

  return taskConfig;
}

/** Converts the Che command to Task API object */
export function toTask(command: cheApi.workspace.Command): Task {
  return {
    definition: {
      type: CHE_TASK_TYPE,
      command: command.commandLine,
      target: {
        workingDir: getAttribute(WORKING_DIR_ATTRIBUTE, command.attributes),
        component: getAttribute(COMPONENT_ALIAS_ATTRIBUTE, command.attributes),
      },
      previewUrl: getAttribute(PREVIEW_URL_ATTRIBUTE, command.attributes),
    },
    name: `${command.name}`,
    source: CHE_TASK_TYPE,
  };
}

export function getCommandAttribute(command: cheApi.workspace.Command, attrName: string): string | undefined {
  if (!command.attributes) {
    return undefined;
  }

  for (const attr in command.attributes) {
    if (attr === attrName) {
      return command.attributes[attr];
    }
  }
  return undefined;
}
