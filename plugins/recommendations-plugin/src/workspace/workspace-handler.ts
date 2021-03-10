/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import * as che from '@eclipse-che/plugin';

import { injectable } from 'inversify';

/**
 * Allow to restart a workspace.
 */
@injectable()
export class WorkspaceHandler {
  async restart(promptMessage: string): Promise<boolean> {
    const options: che.RestartWorkspaceOptions = {
      prompt: true,
      promptMessage,
    };
    return che.workspace.restartWorkspace(options);
  }
}
