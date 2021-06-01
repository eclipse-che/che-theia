/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { WorkspaceProjectsManager, onDidCloneSources } from './workspace-projects-manager';

import { CreateWorkspaceCommand } from './create-workspace-command';
import { EphemeralWorkspaceChecker } from './ephemeral-workspace-checker';
import { initAskpassEnv } from './askpass/askpass';

interface API {
  readonly onDidCloneSources: theia.Event<void>;
}

export async function start(context: theia.PluginContext): Promise<API> {
  // If PROJECTS_ROOT is defined use it
  // else switch to old env name
  const root =
    (await theia.env.getEnvVariable('PROJECTS_ROOT')) ||
    (await theia.env.getEnvVariable('CHE_PROJECTS_ROOT')) ||
    '/projects';

  // command to create a workspace from devfile
  new CreateWorkspaceCommand(context).init();

  // status bar item indicating that this workpace is ephemeral
  new EphemeralWorkspaceChecker().check();

  await initAskpassEnv();

  new WorkspaceProjectsManager(context, root).run();

  return {
    get onDidCloneSources(): theia.Event<void> {
      return onDidCloneSources;
    },
  };
}

export function stop(): void {}
