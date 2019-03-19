/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';

const fs = require('fs');

const CREATE_WORKSPACE_COMMAND = {
    id: 'factory-plugin.create-workspace',
    label: 'Create Workspace',
    tooltip: 'Create workspace from this DevFile'
};

export class Devfile {

    constructor(private context: theia.PluginContext) {
    }

    init() {
        this.context.subscriptions.push(theia.commands.registerCommand(
            CREATE_WORKSPACE_COMMAND, uri => this.createWorkspace(uri))
        );
    }

    createWorkspace(uri: theia.Uri) {
        if ('file' !== uri.scheme) {
            return;
        }

        const devfileContent = fs.readFileSync(uri.path, 'utf8');
        console.log('>>>> DEVFILE >>>>', devfileContent);
    }

}
