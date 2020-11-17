/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { GitConfigurationController } from './git-configuration-controller';

@injectable()
export class GitConfigurationListenerContribution implements BackendApplicationContribution {
  @inject(GitConfigurationController)
  gitConfigurationListener: GitConfigurationController;

  public onStart(): void {
    this.gitConfigurationListener.watchGitConfigChanges();
    this.gitConfigurationListener.watchUserPreferencesChanges();
  }
}
