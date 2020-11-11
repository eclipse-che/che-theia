/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { CheGitService, GIT_USER_EMAIL, GIT_USER_NAME } from '../common/git-protocol';
import { CommonCommands, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { inject, injectable, postConstruct } from 'inversify';

import { CheGitClientImpl } from './git-config-changes-tracker';
import { UserService } from '@eclipse-che/theia-remote-api/lib/common/user-service';

@injectable()
export class CheTheiaStatusBarFrontendContribution implements FrontendApplicationContribution {
  @inject(StatusBar)
  private statusBar: StatusBar;

  @inject(UserService)
  protected userService: UserService;

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

  checkGitCommiterSettings(): void {
    this.userService
      .getUserPreferences('theia-user-preferences')
      .then(async chePreferences => {
        const theiaPreferences = JSON.parse(
          chePreferences['theia-user-preferences'] ? chePreferences['theia-user-preferences'] : '{}'
        );
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
      })
      .catch(error => {
        console.log(error);
      });
  }

  public showWarn(gitWarning: string): void {
    if (gitWarning) {
      const entry = {
        text: gitWarning,
        tooltip: this.tooltip,
        command: CommonCommands.OPEN_PREFERENCES.id,
        alignment: StatusBarAlignment.LEFT,
      };
      this.statusBar.setElement(this.warnId, entry);
    }
  }

  public hideWarn(): void {
    this.statusBar.removeElement(this.warnId);
  }
}
