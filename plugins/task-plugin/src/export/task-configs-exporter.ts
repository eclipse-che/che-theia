/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as startPoint from '../task-plugin-backend';

import { inject, injectable } from 'inversify';
import { modify, writeFileSync } from '../utils';

import { BackwardCompatibilityResolver } from '../task/backward-compatibility';
import { CheTaskConfigsExtractor } from '../extract/che-task-configs-extractor';
import { ConfigFileTasksExtractor } from '../extract/config-file-task-configs-extractor';
import { ConfigurationsExporter } from './export-configs-manager';
import { TaskConfiguration } from '@eclipse-che/plugin';
import { VsCodeTaskConfigsExtractor } from '../extract/vscode-task-configs-extractor';
import { che as cheApi } from '@eclipse-che/api';
import { homedir } from 'os';
import { resolve } from 'path';

const CONFIG_DIR = '.theia';
const TASK_CONFIG_FILE = 'tasks.json';
const formattingOptions = { tabSize: 4, insertSpaces: true, eol: '' };

export const VSCODE_TASK_TYPE = 'vscode-task';

// this really should be handled through some theia API, but there is none available in plugins
// it only works on linux and only if this plugin runs in the theia container
export const THEIA_USER_TASKS_PATH = resolve(homedir(), CONFIG_DIR, TASK_CONFIG_FILE);

/** Exports configurations of tasks in the config file. */
@injectable()
export class TaskConfigurationsExporter implements ConfigurationsExporter {
  @inject(ConfigFileTasksExtractor)
  protected readonly configFileTasksExtractor: ConfigFileTasksExtractor;

  @inject(CheTaskConfigsExtractor)
  protected readonly cheTaskConfigsExtractor: CheTaskConfigsExtractor;

  @inject(VsCodeTaskConfigsExtractor)
  protected readonly vsCodeTaskConfigsExtractor: VsCodeTaskConfigsExtractor;

  @inject(BackwardCompatibilityResolver)
  protected readonly backwardCompatibilityResolver: BackwardCompatibilityResolver;

  async export(commands: cheApi.workspace.Command[]): Promise<void> {
    const configFileTasks = this.configFileTasksExtractor.extract(THEIA_USER_TASKS_PATH);

    const cheTasks = this.cheTaskConfigsExtractor.extract(commands);
    const vsCodeTasks = this.vsCodeTaskConfigsExtractor.extract(commands);
    const devfileConfigs = this.merge(cheTasks, vsCodeTasks.configs, this.getOutputChannelConflictLogger());
    const configFileConfigs = await this.backwardCompatibilityResolver.resolveComponent(configFileTasks.configs);

    const configFileContent = configFileTasks.content;
    if (configFileContent) {
      this.saveConfigs(
        THEIA_USER_TASKS_PATH,
        configFileContent,
        this.merge(configFileConfigs, devfileConfigs, this.getConsoleConflictLogger())
      );
      return;
    }

    const vsCodeTasksContent = vsCodeTasks.content;
    if (vsCodeTasksContent) {
      this.saveConfigs(THEIA_USER_TASKS_PATH, vsCodeTasksContent, devfileConfigs);
      return;
    }

    if (cheTasks) {
      this.saveConfigs(THEIA_USER_TASKS_PATH, '', cheTasks);
    }
  }

  private merge(
    configurations1: TaskConfiguration[],
    configurations2: TaskConfiguration[],
    conflictHandler: (config1: TaskConfiguration, config2: TaskConfiguration) => void
  ): TaskConfiguration[] {
    const result: TaskConfiguration[] = Object.assign([], configurations1);

    for (const config2 of configurations2) {
      const conflict = configurations1.find(config1 => config1.label === config2.label);
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

  private areEqual(config1: TaskConfiguration, config2: TaskConfiguration): boolean {
    const { type: type1, label: label1, ...properties1 } = config1;
    const { type: type2, label: label2, ...properties2 } = config2;

    if (type1 !== type2 || label1 !== label2) {
      return false;
    }

    return JSON.stringify(properties1) === JSON.stringify(properties2);
  }

  private saveConfigs(tasksConfigFileUri: string, content: string, configurations: TaskConfiguration[]): void {
    const result = modify(
      content,
      ['tasks'],
      configurations.map(config => Object.assign(config, { _scope: undefined })),
      formattingOptions
    );
    writeFileSync(tasksConfigFileUri, result);
  }

  private getOutputChannelConflictLogger(): (config1: TaskConfiguration, config2: TaskConfiguration) => void {
    return (config1: TaskConfiguration, config2: TaskConfiguration) => {
      const outputChannel = startPoint.getOutputChannel();
      outputChannel.show();
      outputChannel.appendLine(
        `Conflict at exporting task configurations: ${JSON.stringify(config1)} and ${JSON.stringify(config2)}`
      );
      outputChannel.appendLine(`The configuration: ${JSON.stringify(config2)} is ignored`);
    };
  }

  private getConsoleConflictLogger(): (config1: TaskConfiguration, config2: TaskConfiguration) => void {
    return (config1: TaskConfiguration, config2: TaskConfiguration) => {
      console.warn(
        `Conflict at exporting task configurations: ${JSON.stringify(config1)} and ${JSON.stringify(config2)}`,
        `The configuration: ${JSON.stringify(config2)} is ignored`
      );
    };
  }
}
