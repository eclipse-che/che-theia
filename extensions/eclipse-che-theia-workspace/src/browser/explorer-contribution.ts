/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ApplicationShell, FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

import { FILE_NAVIGATOR_ID } from '@theia/navigator/lib/browser';

@injectable()
export class ExplorerContribution implements FrontendApplicationContribution {
  @inject(ApplicationShell)
  protected readonly shell: ApplicationShell;

  // Note, it's called only when there is no previous workbench layout state is stored.
  async initializeLayout(app: FrontendApplication): Promise<void> {
    this.shell.revealWidget(FILE_NAVIGATOR_ID);
  }
}
