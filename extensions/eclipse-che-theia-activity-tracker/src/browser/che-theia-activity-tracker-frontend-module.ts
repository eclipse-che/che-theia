/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ACTIVITY_TRACKER_SERVICE_PATH, ActivityTrackerService } from '../common/activity-tracker-protocol';
import { FrontendApplicationContribution, WebSocketConnectionProvider } from '@theia/core/lib/browser';

import { CheTheiaActivityTrackerFrontendContribution } from './che-theia-activity-tracker-contribution';
import { ContainerModule } from 'inversify';

export default new ContainerModule(bind => {
  bind(ActivityTrackerService)
    .toDynamicValue(context =>
      context.container
        .get(WebSocketConnectionProvider)
        .createProxy<ActivityTrackerService>(ACTIVITY_TRACKER_SERVICE_PATH)
    )
    .inSingletonScope();

  bind(FrontendApplicationContribution).to(CheTheiaActivityTrackerFrontendContribution);
});
