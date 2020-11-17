/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { handleWorkspaceProjects, onDidCloneSources } from './workspace-projects-manager';

import { Devfile } from './devfile';
import { EphemeralWorkspaceChecker } from './ephemeral-workspace-checker';
import { initAskpassEnv } from './askpass';

interface API {
  readonly onDidCloneSources: theia.Event<void>;
}

export async function start(context: theia.PluginContext): Promise<API> {
  let projectsRoot = '/projects';
  const projectsRootEnvVar = await theia.env.getEnvVariable('CHE_PROJECTS_ROOT');
  if (projectsRootEnvVar) {
    projectsRoot = projectsRootEnvVar;
  }

  new Devfile(context).init();
  new EphemeralWorkspaceChecker().check();
  await initAskpassEnv();
  handleWorkspaceProjects(context, projectsRoot);

  return {
    get onDidCloneSources(): theia.Event<void> {
      return onDidCloneSources;
    },
  };
}

export function stop(): void {}
