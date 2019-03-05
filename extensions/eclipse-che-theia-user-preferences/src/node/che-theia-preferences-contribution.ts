/********************************************************************************
 * Copyright (C) 2018-2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
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
