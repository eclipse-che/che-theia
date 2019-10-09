/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
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

import { injectable, inject, postConstruct } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
// import { GitPreferences } from './git-preferences';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { CheGitNoticationClient } from '../common/git-notification-proxy';

@injectable()
export class CheTheiaStatusBarFrontendContribution implements FrontendApplicationContribution, CheGitNoticationClient {

    @inject(StatusBar)
    private statusBar: StatusBar;

    @inject(CheApiService)
    protected cheApiService: CheApiService;

    @postConstruct()
    initialize(): void {
        this.cheApiService.getUserPreferences('theia-user-preferences').then(chePreferences => {
            const theiaPreferences = JSON.parse(chePreferences['theia-user-preferences'] ? chePreferences['theia-user-preferences'] : '{}');
            // const theiaPreferencesBeautified = JSON.stringify(JSON.parse(theiaPreferences), undefined, 3);
            console.log(theiaPreferences);
            Object.keys(theiaPreferences).forEach(key => {
                console.log('Found.nn' + key);
            });

            const email = theiaPreferences['git.user.email'];
            const name = theiaPreferences['git.user.name'];
            //    this.setStatusItem(email);
            let msg = '';
            if (!email) {
                msg += ' user.email ';
            }
            if (!name) {
                msg += ' user.name ';
            }
            if (msg) {
                this.setStatusItem('Git' + msg + ' hjhj');
            }

        }).catch(function (error1) {
            console.log(error1);
        });
    }

    public setStatusItem(chePreferences: string) {
        const entry = {
            text: chePreferences,
            alignment: StatusBarAlignment.LEFT
        };
        this.statusBar.setElement('id.git.config', entry);
    }

    notify() {
        alert('hhhh .  ');
        const entry = {
            text: '',
            alignment: StatusBarAlignment.LEFT
        };
        this.statusBar.setElement('id.git.config', entry);
    }
}
