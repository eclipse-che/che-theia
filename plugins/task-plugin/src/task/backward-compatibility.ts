/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject } from 'inversify';
import * as che from '@eclipse-che/plugin';
import { CHE_TASK_TYPE } from './task-protocol';
import { CheWorkspaceClient } from '../che-workspace-client';
import { getAttribute } from '../utils';
import { COMPONENT_ATTRIBUTE } from '../machine/machines-picker';

/** Contains logic to provide backward compatibility. */
@injectable()
export class BackwardCompatibilityResolver {

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient!: CheWorkspaceClient;

    /**
     * Provides backward compatibility for `containerName` field of task configuration.
     * `containerName` was used to indicate which container should be used for running task configuration
     * `component` is used instead of `containerName` for this goal.
     *
     * So, the following configuration:
     * {
     *     "type": "che",
     *     "label": "theia:build",
     *     "command": "yarn",
     *     "target": {
     *        "workingDir": "/projects/theia",
     *        "containerName": "che-dev"
     *      }
     *  }
     *
     * should be replaced by:
     *
     * {
     *     "type": "che",
     *     "label": "theia:build",
     *     "command": "yarn",
     *     "target": {
     *        "workingDir": "/projects/theia",
     *        "component": "che-dev"
     *      }
     *  }
     *
     * Note: `containerName` is replaced by empty `component` field if the corresponding component is not found.
     *       List of containers is displayed at running task for this case and user has opportunity to select a container for running.
     *
     * @param configs task configurations for resolving
     */
    async resolveComponent(configs: che.TaskConfiguration[]): Promise<che.TaskConfiguration[]> {
        if (configs.length === 0) {
            return configs;
        }

        const containers = await this.cheWorkspaceClient.getMachines();
        for (const config of configs) {
            if (config.type !== CHE_TASK_TYPE) {
                continue;
            }

            const target = config.target;
            if (!target || !target.containerName) {
                continue;
            }

            const containerName = target.containerName;
            target.containerName = undefined;
            target.component = '';

            if (!containers.hasOwnProperty(containerName)) {
                continue;
            }

            const container = containers[containerName];
            const component = getAttribute(COMPONENT_ATTRIBUTE, container.attributes);
            if (component) {
                target.component = component;
            }
        }
        return configs;
    }
}
