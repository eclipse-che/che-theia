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
import URI from '@theia/core/lib/common/uri';
import { ActivityTrackerService } from '../common/activity-tracker-protocol';
import { CheApiService } from '@eclipse-che/theia-plugin-ext/lib/common/che-protocol';
import * as http from 'http';

/**
 * Server side part of Theia activity tracker.
 * Receives activity updates from clients and sends reset inactivity requests to Che workspace master.
 * To avoid duplicate requests from different frontend clients may send requests periodically. This mean
 * that, in the worst case, it might keep user's workspace alive for the period longer.
 * Che master API url for resetting inactive timeout: che-host[:port]/api/activity/<workspace-ID>
 */
@injectable()
export class ActivityTrackerServiceImpl implements ActivityTrackerService {

    private static WORKSPACE_ID_ENV_VAR_NAME = 'CHE_WORKSPACE_ID';
    private static MACHINE_TOKEN_ENV_VAR_NAME = 'CHE_MACHINE_TOKEN';
    private static CHE_API_ENV_VAR_NAME = 'CHE_API_INTERNAL';

    // Time before sending next request. If a few requests from frontend(s) are recieved during this period,
    // only one request to workspace master will be sent.
    private static REQUEST_PERIOD_MS = 1 * 60 * 1000;
    // Time before resending request to workspace master if a network error occurs.
    private static RETRY_REQUEST_PERIOD_MS = 5 * 1000;
    // Number of retries before give up if a network error occurs.
    private static RETRY_COUNT = 5;

    // Indicates state of the timer. If true timer is running.
    private isTimerRunning: boolean;
    // Flag which is used to check if new requests were recieved during timer awaiting.
    private isNewRequest: boolean;

    // http or https module to make requestst to Che API.
    private pinger: { request(option: http.RequestOptions): http.ClientRequest };
    private activityRequestOptions: http.RequestOptions;

    @inject(CheApiService)
    protected cheApiService: CheApiService;

    constructor() {
        const workspaceId = process.env[ActivityTrackerServiceImpl.WORKSPACE_ID_ENV_VAR_NAME];
        if (!workspaceId) {
            throw new Error('Cannot retrieve workspace ID');
        }

        const apiUrlString = process.env[ActivityTrackerServiceImpl.CHE_API_ENV_VAR_NAME];
        if (!apiUrlString) {
            throw new Error('Cannot retrieve Che API uri');
        }

        const apiUrl = new URI(apiUrlString);
        this.activityRequestOptions = {
            path: apiUrl.path + '/activity/' + workspaceId,
            method: 'PUT'
        };
        const authorityColonPos = apiUrl.authority.indexOf(':');
        if (authorityColonPos === -1) {
            this.activityRequestOptions.hostname = apiUrl.authority;
            this.activityRequestOptions.port = apiUrl.scheme === 'http' ? 80 : 443;
        } else {
            this.activityRequestOptions.hostname = apiUrl.authority.substring(0, authorityColonPos);
            this.activityRequestOptions.port = apiUrl.authority.substring(authorityColonPos + 1);
        }

        const token = process.env[ActivityTrackerServiceImpl.MACHINE_TOKEN_ENV_VAR_NAME];
        if (token) {
            this.activityRequestOptions.headers = { 'Authorization': 'Bearer ' + token };
        }

        this.pinger = apiUrl.scheme === 'http' ? require('http') : require('https');

        this.isTimerRunning = false;
        this.isNewRequest = false;
    }

    /**
     * Invoked each time when a client sends an activity request.
     */
    resetTimeout(): void {
        if (this.isTimerRunning) {
            this.isNewRequest = true;
            return;
        }

        this.sendRequestAndSetTimer();
    }

    private sendRequestAndSetTimer(): void {
        this.sendRequest();
        this.isNewRequest = false;

        setTimeout(() => this.checkNewRequestsTimerCallback(), ActivityTrackerServiceImpl.REQUEST_PERIOD_MS);
        this.isTimerRunning = true;
    }

    private checkNewRequestsTimerCallback(): void {
        this.isTimerRunning = false;

        if (this.isNewRequest) {
            this.sendRequestAndSetTimer();
        }
    }

    private sendRequest(attemptsLeft: number = ActivityTrackerServiceImpl.RETRY_COUNT): void {
        this.cheApiService.submitTelemetryActivity();
        const request = this.pinger.request(this.activityRequestOptions);
        request.on('error', (error: Error) => {
            if (attemptsLeft > 0) {
                setTimeout(() => this.sendRequest(), ActivityTrackerServiceImpl.RETRY_REQUEST_PERIOD_MS, --attemptsLeft);
            } else {
                console.error('Activity tracker: Failed to ping workspace master: ', error.message);
            }
        });
        request.end();
    }

}
