/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TaskDefinition } from '@theia/plugin';

export const CHE_TASK_TYPE: string = 'che';
export const MACHINE_NAME_ATTRIBUTE: string = 'machineName';
export const PREVIEW_URL_ATTRIBUTE: string = 'previewUrl';
export const WORKING_DIR_ATTRIBUTE: string = 'workingDir';

export interface CheTaskDefinition extends TaskDefinition {
    readonly target?: Target,
    readonly previewUrl?: string
}

export interface Target {
    workspaceId?: string,
    containerName?: string,
    workingDir?: string
}
