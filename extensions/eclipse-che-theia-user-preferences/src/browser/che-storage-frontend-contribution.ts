/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { FrontendApplicationContribution, FrontendApplication, StorageService, ShellLayoutRestorer } from '@theia/core/lib/browser';
import { injectable, inject } from 'inversify';
import { StorageServicePreferences } from './che-storage-preferences';

@injectable()
export class LayoutChangeListener implements FrontendApplicationContribution {

    @inject(StorageService)
    protected storageService: StorageService;

    @inject(StorageServicePreferences)
    protected storagePreferences: StorageServicePreferences;

    @inject(ShellLayoutRestorer)
    protected shellLayoutRestorer: ShellLayoutRestorer;

    protected timer: number | undefined;
    protected app: FrontendApplication;

    configure(app: FrontendApplication): void {
        this.app = app;
        app.shell.onDidAddWidget(() => this.startTimer());
        app.shell.onDidRemoveWidget(() => this.startTimer());
        app.shell.onDidChangeActiveWidget(() => this.startTimer());
        app.shell.onDidChangeCurrentWidget(() => this.startTimer());
    }

    protected startTimer(): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = window.setTimeout(() => {
            this.timer = undefined;
            this.shellLayoutRestorer.storeLayout(this.app);

        }, this.storagePreferences['workbench.layout.saveTimeout']);

    }

}
