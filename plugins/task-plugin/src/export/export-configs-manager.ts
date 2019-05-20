/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable, inject, multiInject } from 'inversify';
import { CheWorkspaceClient } from '../che-workspace-client';
import * as theia from '@theia/plugin';
import { che as cheApi } from '@eclipse-che/api';

export const ConfigurationsExporter = Symbol('ConfigurationsExporter');

/** Exports content with configurations in the config file */
export interface ConfigurationsExporter {

    /** Type of the exporter corresponds to type of command which brings content with configs */
    readonly type: string;

    /**
     * Exports given content with configurations in the config file of given workspace folder
     * @param configsContent content with configurations for export
     * @param workspaceFolder workspace folder for exporting configs in the config file
     */
    export(configsContent: string, workspaceFolder: theia.WorkspaceFolder): void;
}

/** Reads the commands from the current Che workspace and exports task and launch configurations in the config files. */
@injectable()
export class ExportConfigurationsManager {

    @inject(CheWorkspaceClient)
    protected readonly cheWorkspaceClient: CheWorkspaceClient;

    @multiInject(ConfigurationsExporter)
    protected readonly exporters: ConfigurationsExporter[];

    async export() {
        const workspaceFolders = theia.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length < 1) {
            return;
        }

        const cheCommands = await this.cheWorkspaceClient.getCommands();
        for (const exporter of this.exporters) {
            const configsContent = this.extractConfigsContent(exporter.type, cheCommands);
            if (!configsContent) {
                continue;
            }

            this.exportContent(configsContent, exporter, workspaceFolders);
        }
    }

    private exportContent(configsContent: string, exporter: ConfigurationsExporter, workspaceFolders: theia.WorkspaceFolder[]) {
        for (const workspaceFolder of workspaceFolders) {
            exporter.export(configsContent, workspaceFolder);
        }
    }

    private extractConfigsContent(type: string, commands: cheApi.workspace.Command[]): string {
        const configCommands = commands.filter(command => command.type === type);
        if (configCommands.length === 0) {
            return '';
        }

        if (configCommands.length > 1) {
            console.warn(`Found duplicate entry for type ${type}`);
        }

        const configCommand = configCommands[0];
        if (!configCommand || !configCommand.attributes || !configCommand.attributes.actionReferenceContent) {
            return '';
        }

        return configCommand.attributes.actionReferenceContent;
    }
}
