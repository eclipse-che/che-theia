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

    this._containers = componentStatuses.map(componentStatus => {
      // search for a matching component
      const devfileComponent = (devfile.components || []).find(component => component.name === componentStatus.name);

      const container: IContainer = {
        name: componentStatus.name,
        status: 'RUNNING',
        endpoints: componentStatus.endpoints,
        isDev: componentStatus.isUser,
      };
      if (devfileComponent && devfileComponent.container) {
        container.env = devfileComponent.container.env;
        container.volumeMounts = devfileComponent.container.volumeMounts;
        container.commands = this.getContainerCommands(componentStatus.name, devfile);
      }
      return container;
    });
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
