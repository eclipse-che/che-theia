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

import { CHE_TASK_TYPE, PREVIEW_URL_ATTRIBUTE } from './task-protocol';

import { TaskConfiguration } from '@eclipse-che/plugin';
import { getAttribute } from '../utils';

/** Converts the Che command to Theia Task Configuration */
export function toTaskConfiguration(command: che.devfile.DevfileCommand): TaskConfiguration {
  const taskConfig: TaskConfiguration = {
    type: CHE_TASK_TYPE,
    label: command.id,
    command: command.exec?.commandLine,
    _scope: '', // not to put into tasks.json
    target: {
      workingDir: command.exec?.workingDir,
      component: command.exec?.component,
    },
    previewUrl: getAttribute(PREVIEW_URL_ATTRIBUTE, command.attributes),
    problemMatcher: [],
  };

  return taskConfig;
}

export function getCommandAttribute(command: che.devfile.DevfileCommand, attrName: string): string | undefined {
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
