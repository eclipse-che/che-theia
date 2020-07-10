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
import { handleWorkspaceProjects } from './workspace-projects-manager';
import { EphemeralWorkspaceChecker } from './ephemeral-workspace-checker';
import { Devfile } from './devfile';
import { initAskpassEnv } from './askpass';

export async function start(context: theia.PluginContext): Promise<void> {
    let projectsRoot = '/projects';
    const projectsRootEnvVar = await theia.env.getEnvVariable('CHE_PROJECTS_ROOT');
    if (projectsRootEnvVar) {
        projectsRoot = projectsRootEnvVar;
    }

    new Devfile(context).init();
    new EphemeralWorkspaceChecker().check();
    await initAskpassEnv();
    await new FactoryInitializer(projectsRoot).run();
    handleWorkspaceProjects(context, projectsRoot);
}

export function stop(): void {
}
