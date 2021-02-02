/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { FrontendApplication, FrontendApplicationContribution, ShellLayoutRestorer } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

import { CheShellLayoutRestorer } from './che-shell-layout-restorer';
import { ILogger } from '@theia/core';
import { StorageServicePreferences } from './che-storage-preferences';

@injectable()
export class CheFrontendApplication implements FrontendApplicationContribution {
  protected layoutPersistenceTimer: number | undefined = undefined;

  constructor(
    @inject(CheShellLayoutRestorer) protected readonly layoutRestorer: ShellLayoutRestorer,
    @inject(ILogger) protected readonly logger: ILogger,
    @inject(StorageServicePreferences) protected readonly storagePreferences: StorageServicePreferences
  ) {}

  async onDidInitializeLayout(app: FrontendApplication): Promise<void> {
    await this.logger.info('Setup shell layout persistence scheduler.');
    this.registerEventListeners(app);
    return Promise.resolve();
  }

  protected registerEventListeners(app: FrontendApplication) {
    window.addEventListener('resize', () => this.scheduleLayoutPersistence(app));
    document.addEventListener('keydown', () => this.scheduleLayoutPersistence(app));
    document.addEventListener('mousedown', () => this.scheduleLayoutPersistence(app));
    document.addEventListener('mousemove', () => this.scheduleLayoutPersistence(app));
  }

  protected scheduleLayoutPersistence(app: FrontendApplication) {
    this.clearTimeout(this.layoutPersistenceTimer);

    this.layoutPersistenceTimer = this.setTimeout(() => {
      this.layoutRestorer.storeLayout(app);
    }, this.storagePreferences['workbench.layout.saveTimeout']);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected setTimeout(handler: (...args: any[]) => void, timeout: number): number {
    return window.setTimeout(handler, timeout);
  }

  protected clearTimeout(handle: number | undefined): void {
    window.clearTimeout(handle);
  }
}
