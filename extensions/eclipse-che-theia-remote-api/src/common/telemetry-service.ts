/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

export const cheTelemetryServicePath = '/services/che-telemetry-service';

export const TelemetryService = Symbol('TelemetryService');

export interface TelemetryService {
  submitTelemetryEvent(
    id: string,
    ownerId: string,
    ip: string,
    agent: string,
    resolution: string,
    properties: [string, string][]
  ): Promise<void>;
  submitTelemetryActivity(): Promise<void>;
}
