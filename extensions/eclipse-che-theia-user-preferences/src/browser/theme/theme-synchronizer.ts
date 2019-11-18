/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { injectable, inject } from 'inversify';
import { FrontendApplicationContribution, PreferenceServiceImpl, PreferenceScope } from '@theia/core/lib/browser';
import { TheiaThemePreferences } from './theme-preferences';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { MaybePromise } from '@theia/core';

@injectable()
export class TheiaThemePreferenceSynchronizer implements FrontendApplicationContribution {

    @inject(TheiaThemePreferences)
    protected readonly themePreferences: TheiaThemePreferences;

    @inject(PreferenceServiceImpl)
    protected readonly preferenceService: PreferenceServiceImpl;

    private uiChange = false;
    private preferenceChange = false;

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

        ThemeService.get().onThemeChange(e => {
            if (this.preferenceChange) {
                this.preferenceChange = false;
                return;
            }
            this.uiChange = true;
            this.preferenceService.set('workbench.appearance.colorTheme', e.newTheme.id, PreferenceScope.User);
        });
    }

    configure(): MaybePromise<void> {
        ThemeService.get().setCurrentTheme(this.themePreferences['workbench.appearance.colorTheme']);
    }
}
