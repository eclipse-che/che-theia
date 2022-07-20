/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';

export interface IContainer {
  name: string;
  isDev: boolean;
  status?: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
  endpoints?: {
    [endpointName: string]: {
      url?: string;
    };
  };
  env?: che.devfile.DevfileComponentEnv[];
  volumeMounts?: che.devfile.DevfileComponentVolumeMount[];
  commands?: { commandName: string; commandLine: string }[];
}

export class ContainersService {
  private _containers: Array<IContainer>;

  constructor() {
    this._containers = [];
  }

  async updateContainers(): Promise<void> {
    const componentStatuses = await che.devfile.getComponentStatuses();

    const devfile = await che.devfile.get();

    const devfileComponentsWithContainers = (devfile.components || []).filter(c => c.container);
    const containers = [];
    // eslint-disable-next-line guard-for-in
    for (const component of devfileComponentsWithContainers) {
      const componentStatus = componentStatuses.find(c => c.name === component.name);
      if (!componentStatus) {
        return;
      }
      const container: IContainer = {
        name: component.name!,
        status: 'RUNNING',
        endpoints: componentStatus.endpoints,
        isDev: componentStatus.isUser,
        env: component.container!.env,
        volumeMounts: component.container!.volumeMounts,
        commands: this.getContainerCommands(component.name!, devfile),
      };
      containers.push(container);
    }
    this._containers = containers;
  }

  get containers(): Array<IContainer> {
    return this._containers;
  }

  private getContainerCommands(
    componentName: string,
    devfile: che.devfile.Devfile
  ): { commandName: string; commandLine: string }[] {
    // only interested in exec commands targeting this component
    const execCommands =
      devfile.commands?.filter(command => command.exec && command.exec.component === componentName) || [];
    // apply sort
    return execCommands
      .map(command => ({ commandName: command.id, commandLine: command.exec?.commandLine || '' }))
      .sort((a, b) => a.commandName.localeCompare(b.commandName));
  }
}
