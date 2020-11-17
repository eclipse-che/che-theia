/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable } from 'inversify';

import { ActivityTrackerService } from '../common/activity-tracker-protocol';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';

/**
 * Client side part of Theia activity tracker.
 * Treats any key press or mouse event as an activity and sends activity update to Theia backed.
 * To avoid flood of backend, sends updates periodially, unless last activity was detected after idling.
 * Might keep workspace alive on the period longer.
 */
@injectable()
export class CheTheiaActivityTrackerFrontendContribution implements FrontendApplicationContribution {
  // Period for which all activity events turn into one request to backend.
  private static REQUEST_PERIOD_MS = 1 * 60 * 1000;

  private isAnyActivity: boolean;
  private isTimerRunning: boolean;

  constructor(@inject(ActivityTrackerService) private activityService: ActivityTrackerService) {
    this.isAnyActivity = false;
    this.isTimerRunning = false;
  }

  initialize(): void {
    window.addEventListener('keydown', () => this.onAnyActivity());
    window.addEventListener('mousedown', () => this.onAnyActivity());
    window.addEventListener('mousemove', () => this.onAnyActivity());

    // is needed if user reopens browser tab
    this.sendRequestAndSetTimer();
  }

  private onAnyActivity(): void {
    this.isAnyActivity = true;

    if (!this.isTimerRunning) {
      this.sendRequestAndSetTimer();
    }
  }

  private sendRequestAndSetTimer(): void {
    this.activityService.resetTimeout();
    this.messageUpdateKeycloakToken();
    this.isAnyActivity = false;

    setTimeout(() => this.checkActivityTimerCallback(), CheTheiaActivityTrackerFrontendContribution.REQUEST_PERIOD_MS);
    this.isTimerRunning = true;
  }

  private checkActivityTimerCallback(): void {
    this.isTimerRunning = false;
    if (this.isAnyActivity) {
      this.sendRequestAndSetTimer();
    }
  }

  private messageUpdateKeycloakToken(): void {
    window.parent.postMessage(`update-token:${CheTheiaActivityTrackerFrontendContribution.REQUEST_PERIOD_MS}`, '*');
  }
}
