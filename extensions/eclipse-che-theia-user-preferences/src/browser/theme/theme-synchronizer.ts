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
import { injectable, inject } from 'inversify';
import { FrontendApplicationContribution, PreferenceServiceImpl, PreferenceScope } from '@theia/core/lib/browser';
import { MaybePromise, Disposable } from '@theia/core';
import { TheiaThemePreferences } from './theme-preferences';
import { ThemeService } from '@theia/core/lib/browser/theming';

@injectable()
export class TheiaThemePreferenceSynchronizer implements FrontendApplicationContribution {

    @inject(TheiaThemePreferences)
    protected readonly themePreferences: TheiaThemePreferences;

    @inject(PreferenceServiceImpl)
    protected readonly preferenceService: PreferenceServiceImpl;

    private uiChange = true;
    private preferenceChange = false;
    private themeListener: Disposable | undefined;
    initialize(): void {
        this.preferenceService.onPreferenceChanged(preference => {
            if (preference.preferenceName === 'workbench.appearance.colorTheme') {
                if (this.uiChange) {
                    this.uiChange = false;
                    return;
                }
                this.preferenceChange = true;
                ThemeService.get().setCurrentTheme(preference.newValue);
            }
        });
        if (!this.themeListener) {
            this.themeListener = ThemeService.get().onThemeChange(e => {
                if (this.preferenceChange) {
                    this.preferenceChange = false;
                    return;
                }
                this.uiChange = true;
                this.preferenceService.set('workbench.appearance.colorTheme', e.newTheme.id, PreferenceScope.User);
            });
        }
    }

    configure(): MaybePromise<void> {
        ThemeService.get().setCurrentTheme(this.themePreferences['workbench.appearance.colorTheme']);
    }
}
