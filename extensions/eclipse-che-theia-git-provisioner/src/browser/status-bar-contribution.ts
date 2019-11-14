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
import { FrontendApplicationContribution, CommonCommands } from '@theia/core/lib/browser';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import { CheGitService, GIT_USER_EMAIL, GIT_USER_NAME } from '../common/git-protocol';
import { CheGitClientImpl } from './git-config-changes-tracker';

@injectable()
export class CheTheiaStatusBarFrontendContribution implements FrontendApplicationContribution {

    @inject(StatusBar)
    private statusBar: StatusBar;

    @inject(CheApiService)
    protected cheApiService: CheApiService;

    @inject(CheGitService)
    protected gitService: CheGitService;

    @inject(CheGitClientImpl)
    protected gitClient: CheGitClientImpl;

    private message = 'Git: set your username/email config';
    private tooltip = 'Set git.username and git.useremail in UserPrefrences';
    private warnId = 'id.git.config.warning';

    @postConstruct()
    initialize(): void {
        this.checkGitCommiterSettings();
        this.gitClient.changeEvent(() => {
            this.checkGitCommiterSettings();
        });
    }

    checkGitCommiterSettings() {
        this.cheApiService.getUserPreferences('theia-user-preferences').then(async chePreferences => {
            const theiaPreferences = JSON.parse(chePreferences['theia-user-preferences'] ? chePreferences['theia-user-preferences'] : '{}');
            const email = theiaPreferences[GIT_USER_EMAIL];
            const name = theiaPreferences[GIT_USER_NAME];
            if (email && name) {
                this.hideWarn();
            } else {
                const config = await this.gitService.getUserConfigurationFromGitConfig();
                if (config.name && config.email) {
                    this.hideWarn();
                } else {
                    this.showWarn(this.message);
                }
            }
        }).catch(error => {
            console.log(error);
        });
    }

    public showWarn(gitWarning: string) {
        if (gitWarning) {
            const entry = {
                text: gitWarning,
                tooltip: this.tooltip,
                command: CommonCommands.OPEN_PREFERENCES.id,
                alignment: StatusBarAlignment.LEFT
            };
            this.statusBar.setElement(this.warnId, entry);
        }
    }

    public hideWarn() {
        this.statusBar.removeElement(this.warnId);
    }
}
