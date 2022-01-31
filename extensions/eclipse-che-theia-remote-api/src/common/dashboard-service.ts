/**********************************************************************
 * Copyright (c) 2021-2022 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export const cheDashboardServicePath = '/services/che-dashboard-service';

export const DashboardService = Symbol('DashboardService');

export interface DashboardService {
  getDashboardUrl(): Promise<string | undefined>;

  getEditorUrl(): Promise<string | undefined>;
}
