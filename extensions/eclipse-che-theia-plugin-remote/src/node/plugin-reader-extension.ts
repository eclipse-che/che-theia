/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as path from 'path';
import * as express from 'express';
import * as escape_html from 'escape-html';
import { injectable, inject } from 'inversify';
import { HostedPluginReader } from '@theia/plugin-ext/lib/hosted/node/plugin-reader';
import { HostedPluginRemote } from './hosted-plugin-remote';

/**
 * Patches original plugin reader to be able to retrieve remote plugin resources.
 */
@injectable()
export class PluginReaderExtension {

    // To be set on connection creation
    // If there are more than one cnnection, the last one will be used.
    private hostedPluginRemote: HostedPluginRemote;

    setRemotePluginConnection(hostedPluginRemote: HostedPluginRemote): void {
        this.hostedPluginRemote = hostedPluginRemote;
    }

    // Map between a plugin id and its local resources storage
    private pluginsStorage: Map<string, string>;

    constructor(@inject(HostedPluginReader) hostedPluginReader: HostedPluginReader) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const disclosedPluginReader = (hostedPluginReader as any);
        // Get link to plugins storages info
        this.pluginsStorage = disclosedPluginReader.pluginsIdsFiles;
        // Replace handleMissingResource method, but preserve this of current class
        const contextedHandleMissingResource = this.handleMissingResource.bind(this);
        disclosedPluginReader.handleMissingResource = contextedHandleMissingResource;
    }

    // Handles retrieving of remote resource for plugins.
    private async handleMissingResource(req: express.Request, res: express.Response): Promise<void> {
        const pluginId = req.params.pluginId;
        if (this.hostedPluginRemote) {
            const resourcePath = req.params.path;
            try {
                const resource = await this.hostedPluginRemote.requestPluginResource(pluginId, resourcePath);
                if (resource) {
                    res.type(path.extname(resourcePath));
                    res.send(resource);
                    return;
                }
            } catch (e) {
                console.error('Failed to get plugin resource from sidecar. Error:', e);
            }
        }

        res.status(404).send(`The plugin with id '${escape_html(pluginId)}' does not exist.`);
    }

    // Exposes paths of plugin resources for other components.
    public getPluginRootDirectory(pluginId: string): string | undefined {
        return this.pluginsStorage.get(pluginId);
    }
}
