/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { inject, injectable, multiInject } from 'inversify';

import { CheWorkspaceClient } from '../che-workspace-client';
import { LaunchConfigurationsExporter } from './launch-configs-exporter';
import { che as cheApi } from '@eclipse-che/api';

export const ConfigurationsExporter = Symbol('ConfigurationsExporter');

/** Exports content with configurations in the config file */
export interface ConfigurationsExporter {
  /**
   * Exports configurations in the config file of given workspace folder
   * @param workspaceFolder workspace folder for exporting configs in the config file
   * @param commands commands with configurations for export
   */
  export(commands: cheApi.workspace.Command[]): Promise<void>;
}
/** Contains configurations as array of object and as raw content and is used at getting configurations from config file for example */
export interface Configurations<T> {
  /** Raw content with configurations from config file */
  content: string;

  /** Configurations as array of objects */
  configs: T[];
}

/** Reads the commands from the current Che workspace and exports task and launch configurations in the config files. */
@injectable()
export class ExportConfigurationsManager {
  @inject(CheWorkspaceClient)
  protected readonly cheWorkspaceClient: CheWorkspaceClient;

  @multiInject(ConfigurationsExporter)
  protected readonly exporters: ConfigurationsExporter[];

  @inject(LaunchConfigurationsExporter)
  protected readonly launchConfigurationsExporter: LaunchConfigurationsExporter;

  protected cheCommands: cheApi.workspace.Command[] = [];

  async init(): Promise<void> {
    this.cheCommands = await this.cheWorkspaceClient.getCommands();
    this.launchConfigurationsExporter.init(this.cheCommands);
    this.export();
  }

  async export(): Promise<void> {
    const exportPromises = [];
    for (const exporter of this.exporters) {
      exportPromises.push(this.doExport(this.cheCommands, exporter));
    }

    await Promise.all(exportPromises);
  }

  private async doExport(cheCommands: cheApi.workspace.Command[], exporter: ConfigurationsExporter): Promise<void> {
    return exporter.export(cheCommands);
  }
}
