/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { FactoryInitializer } from './factory-initializer';
import { WorkspaceProjectsManager } from './workspace-projects-manager';
import { WorkspaceManager } from './workspace-manager';

export async function start(context: theia.PluginContext) {
    let projectsRoot = '/projects';
    const projectsRootEnvVar = await theia.env.getEnvVariable('CHE_PROJECTS_ROOT');
    if (projectsRootEnvVar) {
        projectsRoot = projectsRootEnvVar;
    }

    await new WorkspaceManager().run();
    await new FactoryInitializer(projectsRoot).run();
    await new WorkspaceProjectsManager(context, projectsRoot).run();
}

export function stop() {
}
