/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import * as theia from '@theia/plugin';
import { resolve } from 'path';
import { readFileSync, writeFileSync, format, modify, parse } from '../utils';
import { ConfigurationsExporter } from './export-configs-manager';

const CONFIG_DIR = '.theia';
const LAUNCH_CONFIG_FILE = 'launch.json';
const formattingOptions = { tabSize: 4, insertSpaces: true, eol: '' };

export const VSCODE_LAUNCH_TYPE = 'vscode-launch';

/** Exports content with launch configurations in the config file. */
@injectable()
export class LaunchConfigurationsExporter implements ConfigurationsExporter {
    readonly type: string = VSCODE_LAUNCH_TYPE;

    export(configsContent: string, workspaceFolder: theia.WorkspaceFolder): void {
        const launchConfigFileUri = this.getConfigFileUri(workspaceFolder.uri.path);
        const existingContent = readFileSync(launchConfigFileUri);
        if (configsContent === existingContent) {
            return;
        }

        const configsJson = parse(configsContent);
        if (!configsJson || !configsJson.configurations) {
            return;
        }

        const existingJson = parse(existingContent);
        if (!existingJson || !existingJson.configurations) {
            writeFileSync(launchConfigFileUri, format(configsContent, formattingOptions));
            return;
        }

        const mergedConfigs = this.merge(existingJson.configurations, configsJson.configurations);
        const result = modify(configsContent, ['configurations'], mergedConfigs, formattingOptions);
        writeFileSync(launchConfigFileUri, result);
    }

    private merge(existingConfigs: theia.DebugConfiguration[], newConfigs: theia.DebugConfiguration[]): theia.DebugConfiguration[] {
        const result: theia.DebugConfiguration[] = Object.assign([], newConfigs);
        for (const existing of existingConfigs) {
            if (!newConfigs.some(config => config.name === existing.name)) {
                result.push(existing);
            }
        }
        return result;
    }

    private getConfigFileUri(rootDir: string): string {
        return resolve(rootDir.toString(), CONFIG_DIR, LAUNCH_CONFIG_FILE);
    }
}
