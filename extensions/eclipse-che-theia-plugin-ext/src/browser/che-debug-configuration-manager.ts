/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { injectable, postConstruct } from 'inversify';

import { DebugConfigurationManager } from '@theia/debug/lib/browser/debug-configuration-manager';

@injectable()
export class CheDebugConfigurationManager extends DebugConfigurationManager {
  @postConstruct()
  protected async init(): Promise<void> {
    super.init();

    /**
     * Theia creates a DebugConfigurationModel for each workspace folder in a workspace at starting the IDE.
     * For the CHE multi-root workspace there no workspace folders at that step:
     * CHE clones projects at starting the IDE and adds a workspace folder directly after cloning a project.
     * That's why we need the following logic -
     * DebugConfigurationManager should create the corresponding model when a workspace is changed (a workspace folder is added)
     */
    this.workspaceService.onWorkspaceChanged(() => {
      this.updateModels();
    });
  }
}
