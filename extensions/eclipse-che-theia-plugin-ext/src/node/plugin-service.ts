/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as path from 'path';
import connect = require('connect');
import serveStatic = require('serve-static');
const vhost = require('vhost');
import * as express from 'express';
import { injectable, inject } from 'inversify';
import { WebviewExternalEndpoint } from '@theia/plugin-ext/lib/main/common/webview-protocol';
import { PluginApiContribution } from '@theia/plugin-ext/lib/main/node/plugin-service';
import { CheApiService } from '../common/che-protocol';
import { getUrlDomain, SERVER_TYPE_ATTR, SERVER_IDE_ATTR_VALUE } from '../common/che-server-common';
import { Deferred } from '@theia/core/lib/common/promise-util';

const pluginPath = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + './theia/plugins/';

@injectable()
export class PluginApiContributionIntercepted extends PluginApiContribution {

    @inject(CheApiService)
    private cheApi: CheApiService;

    private waitWebviewEndpoint = new Deferred<void>();

    configure(app: express.Application): void {
        app.get('/plugin/:path(*)', (req, res) => {
            const filePath: string = req.params.path;
            res.sendFile(pluginPath + filePath);
        });

        const webviewApp = connect();
        const pluginExtModulePath = path.dirname(require.resolve('@theia/plugin-ext/package.json'));
        const webviewStaticResources = path.join(pluginExtModulePath, 'src/main/browser/webview/pre');

        this.cheApi.findUniqueServerByAttribute(SERVER_TYPE_ATTR, SERVER_IDE_ATTR_VALUE).then(server => {
            let domain;
            if (server.url) {
                domain = getUrlDomain(server.url);
            }
            const hostName = this.handleAliases(process.env[WebviewExternalEndpoint.pattern] || domain || WebviewExternalEndpoint.pattern);
            webviewApp.use('/webview', serveStatic(webviewStaticResources));

            console.log(`Configuring to accept webviews on '${hostName}' hostname.`);
            app.use(vhost(new RegExp(hostName, 'i'), webviewApp));

            this.waitWebviewEndpoint.resolve();
        }).catch(err => {
            console.log('Unable to configure webview domain: ', err);
            this.waitWebviewEndpoint.resolve();
        });
    }

    async onStart(): Promise<void> {
        await this.waitWebviewEndpoint.promise;
    }

    protected handleAliases(hostName: string): string {
        return hostName.replace('{{uuid}}', '.+').replace('{{hostname}}', '.+');
    }
}
