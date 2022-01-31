/**********************************************************************
 * Copyright (c) 2021-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { DashboardService } from '@eclipse-che/theia-remote-api/lib/common/dashboard-service';
import { injectable } from 'inversify';

@injectable()
export class CheDashboardServiceImpl implements DashboardService {
  async getDashboardUrl(): Promise<string | undefined> {
    return process.env.CHE_DASHBOARD_URL;
  }

  async getEditorUrl(): Promise<string | undefined> {
    return undefined;
  }
}
