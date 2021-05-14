/**********************************************************************
 * Copyright (c) 2019-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as che from '@eclipse-che/plugin';
import * as startPoint from '../task-plugin-backend';
import * as theia from '@theia/plugin';

import { ensureDirExists, modify, writeFile } from '../utils';
import { inject, injectable } from 'inversify';

import { ConfigFileLaunchConfigsExtractor } from '../extract/config-file-launch-configs-extractor';
import { ConfigurationsExporter } from './export-configs-manager';
import { VsCodeLaunchConfigsExtractor } from '../extract/vscode-launch-configs-extractor';
import { resolve } from 'path';

const CONFIG_DIR = '.theia';
const LAUNCH_CONFIG_FILE = 'launch.json';
const formattingOptions = { tabSize: 4, insertSpaces: true, eol: '' };

/** Exports content with launch configurations in the config file. */
@injectable()
export class LaunchConfigurationsExporter implements ConfigurationsExporter {
  @inject(ConfigFileLaunchConfigsExtractor)
  protected readonly configFileLaunchConfigsExtractor: ConfigFileLaunchConfigsExtractor;

  @inject(VsCodeLaunchConfigsExtractor)
  protected readonly vsCodeLaunchConfigsExtractor: VsCodeLaunchConfigsExtractor;

  async init(commands: che.devfile.DevfileCommand[]): Promise<void> {
    console.error('+++++++++++++++++++++++++++++ LaunchConfigurationsExporter ++++ INIT ');
    theia.workspace.onDidChangeWorkspaceFolders(
      event => {
        console.error('+++ LaunchConfigurationsExporter ++++ onDidChangeWorkspaceFolders ');
        const workspaceFolders: theia.WorkspaceFolder[] | undefined = event.added;
        if (workspaceFolders && workspaceFolders.length > 0) {
          console.error(
            '+++ LaunchConfigurationsExporter ++++ onDidChangeWorkspaceFolders +++ workspaceFolders.length > 0 '
          );
          this.export(commands, workspaceFolders);
        } else {
          console.error(
            '+++ LaunchConfigurationsExporter ++++ onDidChangeWorkspaceFolders +++ NOT workspaceFolders.length > 0 '
          );
        }
      },
      undefined,
      startPoint.getSubscriptions()
    );
  }

  async export(commands: che.devfile.DevfileCommand[], workspaceFolders?: theia.WorkspaceFolder[]): Promise<void> {
    console.error('+++ LaunchConfigurationsExporter ++++ EXPORT ');
    workspaceFolders = workspaceFolders ? workspaceFolders : theia.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.error('+++ LaunchConfigurationsExporter ++++ EXPORT +++ RETURN ');
      return;
    }

    console.error('+++ LaunchConfigurationsExporter ++++ EXPORT +++ NOT RETURN ', workspaceFolders);

    const exportConfigsPromises: Promise<void>[] = [];

    for (const workspaceFolder of workspaceFolders) {
      console.error('+++ LaunchConfigurationsExporter ++++ EXPORT +++ workspace folder ', workspaceFolder.name);
      exportConfigsPromises.push(this.doExport(workspaceFolder, commands));
    }
    await Promise.all(exportConfigsPromises);
  }

  async doExport(workspaceFolder: theia.WorkspaceFolder, commands: che.devfile.DevfileCommand[]): Promise<void> {
    console.error('+++ LaunchConfigurationsExporter ++++ DO EXPORT ', workspaceFolder.name);
    const workspaceFolderPath = workspaceFolder.uri.path;
    const launchConfigFilePath = resolve(workspaceFolderPath, CONFIG_DIR, LAUNCH_CONFIG_FILE);
    console.error('+++ LaunchConfigurationsExporter ++++ DO EXPORT +++ before extract ', workspaceFolder.name);
    const configFileConfigs = await this.configFileLaunchConfigsExtractor.extract(launchConfigFilePath);
    console.error('+++ LaunchConfigurationsExporter ++++ DO EXPORT +++ after extract ', workspaceFolder.name);
    const vsCodeConfigs = this.vsCodeLaunchConfigsExtractor.extract(commands);
    console.error('+++ LaunchConfigurationsExporter ++++ DO EXPORT +++ after extract 2', workspaceFolder.name);

    const configFileContent = configFileConfigs.content;
    if (configFileContent) {
      return this.saveConfigs(
        workspaceFolderPath,
        configFileContent,
        this.merge(configFileConfigs.configs, vsCodeConfigs.configs, this.getConsoleConflictLogger())
      );
    }

    const vsCodeConfigsContent = vsCodeConfigs.content;
    if (vsCodeConfigsContent) {
      return this.saveConfigs(workspaceFolderPath, vsCodeConfigsContent, vsCodeConfigs.configs);
    }
  }

  private merge(
    configurations1: theia.DebugConfiguration[],
    configurations2: theia.DebugConfiguration[],
    conflictHandler: (config1: theia.DebugConfiguration, config2: theia.DebugConfiguration) => void
  ): theia.DebugConfiguration[] {
    const result: theia.DebugConfiguration[] = Object.assign([], configurations1);

    for (const config2 of configurations2) {
      const conflict = configurations1.find(config1 => config1.name === config2.name);
      if (!conflict) {
        result.push(config2);
        continue;
      }

      if (this.areEqual(config2, conflict)) {
        continue;
      }

      conflictHandler(conflict, config2);
    }
    return result;
  }

  private areEqual(config1: theia.DebugConfiguration, config2: theia.DebugConfiguration): boolean {
    const { type: type1, name: name1, request: request1, ...properties1 } = config1;
    const { type: type2, name: name2, request: request2, ...properties2 } = config2;

    if (type1 !== type2 || name1 !== name2 || request1 !== request2) {
      return false;
    }

    return JSON.stringify(properties1) === JSON.stringify(properties2);
  }

  private async saveConfigs(
    workspaceFolderPath: string,
    content: string,
    configurations: theia.DebugConfiguration[]
  ): Promise<void> {
    /*
        There is an issue related to file watchers: the watcher only reports the first directory when creating recursively directories.
        For example:
            - we would like to create /projects/someProject/.theia/launch.json recursively
            - /projects/someProject directory already exists
            - .theia directory and launch.json file should be created
            - as result file watcher fires an event that .theia directory was created, there is no an event about launch.json file

        The issue is reproduced not permanently.

        We had to use the workaround to avoid the issue: first we create the directory and then - config file
    */

    console.error('+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ workspaceFolderPath ', workspaceFolderPath);
    const configDirPath = resolve(workspaceFolderPath, CONFIG_DIR);
    console.error('+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ configDirPath ', configDirPath);
    await ensureDirExists(configDirPath);
    console.error('+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ AFTER +++ ensureDirExists(configDirPath)');

    const launchConfigFilePath = resolve(configDirPath, LAUNCH_CONFIG_FILE);
    console.error(
      '+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ LAUNCH_config_FILE_Path ',
      launchConfigFilePath
    );
    await ensureDirExists(launchConfigFilePath);
    console.error(
      '+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ AFTER +++ ensureDirExists(launchConfigFilePath)'
    );

    const result = modify(content, ['configurations'], configurations, formattingOptions);
    console.error('+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ AFTER modify ');
    try {
      await writeFile(launchConfigFilePath, result);
      console.error('+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ AFTER write file ');
    } catch (error) {
      console.error('+++ LaunchConfigurationsExporter ++++ SAVE CONFIGS +++ ERROR  ', error);
    }
  }

  private getConsoleConflictLogger(): (config1: theia.DebugConfiguration, config2: theia.DebugConfiguration) => void {
    return (config1: theia.DebugConfiguration, config2: theia.DebugConfiguration) => {
      console.warn(
        `Conflict at exporting launch configurations: ${JSON.stringify(config1)} and ${JSON.stringify(config2)}`,
        `The configuration: ${JSON.stringify(config2)} is ignored`
      );
    };
  }
}
