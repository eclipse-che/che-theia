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

import { TaskConfiguration } from '@eclipse-che/plugin';
import { injectable } from 'inversify';
import { toTaskConfiguration } from '../task/converter';

/** Extracts CHE configurations of tasks. */
@injectable()
export class CheTaskConfigsExtractor {
  extract(commands: che.devfile.DevfileCommand[]): TaskConfiguration[] {
    // TODO filter should be changed according to task type after resolving https://github.com/eclipse/che/issues/12710
    const filteredCommands = commands.filter(command => command.exec);

    if (filteredCommands.length === 0) {
      return [];
    }

    return filteredCommands.map(command => toTaskConfiguration(command));
  }
}
