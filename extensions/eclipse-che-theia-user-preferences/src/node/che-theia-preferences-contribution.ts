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
import { CheTheiaUserPreferencesSynchronizer } from './che-theia-preferences-synchronizer';

@injectable()
export class CheTheiaPreferencesContribution implements BackendApplicationContribution {
  @inject(CheTheiaUserPreferencesSynchronizer)
  cheTheiaUserPreferencesSynchronizer: CheTheiaUserPreferencesSynchronizer;

  public onStart(): void {
    // do not block Theia start here, initialize preferences asynchronously
    this.retrieveAndWatchSettings();
  }

  private async retrieveAndWatchSettings(): Promise<void> {
    // to be able to start file watcher the settings.json file should be in place
    await this.cheTheiaUserPreferencesSynchronizer.readTheiaUserPreferencesFromCheSettings();
    this.cheTheiaUserPreferencesSynchronizer.watchUserPreferencesChanges();
  }
}
