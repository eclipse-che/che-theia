/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { che } from '@eclipse-che/api';

export const cheWorkspaceServicePath = '/services/che-workspace-service';

export const CHEWorkspaceService = Symbol('CHEWorkspaceService');
export interface CHEWorkspaceService {

    getMachineList(): Promise<{ [attrName: string]: che.workspace.Machine }>;

    findTerminalServer(): Promise<che.workspace.Server | undefined>;

    findEditorMachineName(): Promise<string | undefined>

    getWorkspaceId(): Promise<string | undefined>;

    getWsMasterApiEndPoint(): Promise<string | undefined>;
}
