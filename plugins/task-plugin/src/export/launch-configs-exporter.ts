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
import * as theia from '@theia/plugin';
import { che as cheApi } from '@eclipse-che/api';
import { resolve } from 'path';
import { writeFileSync, modify } from '../utils';
import { ConfigurationsExporter } from './export-configs-manager';
import { ConfigFileLaunchConfigsExtractor } from '../extract/config-file-launch-configs-extractor';
import { VsCodeLaunchConfigsExtractor } from '../extract/vscode-launch-configs-extractor';

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

    export(workspaceFolder: theia.WorkspaceFolder, commands: cheApi.workspace.Command[]): void {
        const launchConfigFileUri = this.getConfigFileUri(workspaceFolder.uri.path);
        const configFileConfigs = this.configFileLaunchConfigsExtractor.extract(launchConfigFileUri);
        const vsCodeConfigs = this.vsCodeLaunchConfigsExtractor.extract(commands);

        const configFileContent = configFileConfigs.content;
        if (configFileContent) {
            this.saveConfigs(launchConfigFileUri, configFileContent, this.merge(configFileConfigs.configs, vsCodeConfigs.configs, this.getConsoleConflictLogger()));
            return;
        }

        const vsCodeConfigsContent = vsCodeConfigs.content;
        if (vsCodeConfigsContent) {
            this.saveConfigs(launchConfigFileUri, vsCodeConfigsContent, vsCodeConfigs.configs);
        }
    }

    private merge(configurations1: theia.DebugConfiguration[],
        configurations2: theia.DebugConfiguration[],
        conflictHandler: (config1: theia.DebugConfiguration, config2: theia.DebugConfiguration) => void): theia.DebugConfiguration[] {

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

    private getConfigFileUri(rootDir: string): string {
        return resolve(rootDir.toString(), CONFIG_DIR, LAUNCH_CONFIG_FILE);
    }

    private saveConfigs(launchConfigFileUri: string, content: string, configurations: theia.DebugConfiguration[]) {
        const result = modify(content, ['configurations'], configurations, formattingOptions);
        writeFileSync(launchConfigFileUri, result);
    }

    private getConsoleConflictLogger(): (config1: theia.DebugConfiguration, config2: theia.DebugConfiguration) => void {
        return (config1: theia.DebugConfiguration, config2: theia.DebugConfiguration) => {
            console.warn(`Conflict at exporting launch configurations: ${JSON.stringify(config1)} and ${JSON.stringify(config2)}`,
                `The configuration: ${JSON.stringify(config2)} is ignored`);
        };
    }
}
