/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { FrontendApplication, ShellLayoutRestorer, StorageService, WidgetManager } from '@theia/core/lib/browser';
import {
  FrontendApplicationState,
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import { inject, injectable } from 'inversify';

import { ILogger } from '@theia/core';

/**
 * An extension of default ShellLayoutRestorer. Adds and ability to cache application state
 * and disallows storing application state on the file system if it is not changed. This
 * excludes excessive traffic, which is sent by websocket. The default implementation uses
 * browser LocalStorage, which works faster than the implementation in Che, which uses the
 * file system. The default implementation saves the application state at the time of
 * closing the browser window. At this moment the application state is serialized into a
 * JSON object and is saving into browser Local Storage. Implementation in Che has a delay
 * at the time of saving the application state due to websocket communication. At the time
 * of serializing the application state Che can get incorrect values for the widget’s size.
 * That’s why at the time of closing the browser window, saving the application state on the
 * file system should be disabled. Saving the application state usually kicks in at the time
 * of any user activity with configured delay.
 */
@injectable()
export class CheShellLayoutRestorer extends ShellLayoutRestorer {
  protected previousStoredState: string | undefined;

  constructor(
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
    @inject(ILogger) protected readonly logger: ILogger,
    @inject(StorageService) protected readonly storageService: StorageService,
    @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService
  ) {
    super(widgetManager, logger, storageService);
    stateService.onStateChanged(async (state: FrontendApplicationState) => {
      this.shouldStoreLayout = state !== 'closing_window';
      if (!this.shouldStoreLayout) {
        await logger.info('Disable shell layout persistence. The browser window is in closing state.');
      }
    });
  }

  async storeLayout(app: FrontendApplication) {
    const serializedLayoutData = this.deflate(app.shell.getLayoutData());
    if (this.previousStoredState !== serializedLayoutData) {
      super.storeLayout(app);
      this.previousStoredState = serializedLayoutData;
    }
  }

  async restoreLayout(app: FrontendApplication): Promise<boolean> {
    const restoredLayout = await super.restoreLayout(app);
    if (!restoredLayout) {
      return Promise.resolve(restoredLayout);
    }

    this.previousStoredState = this.deflate(app.shell.getLayoutData());
    return Promise.resolve(true);
  }
}
