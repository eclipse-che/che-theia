/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Generates a `cdn.json` file with the prefixes of CDN where Theia and Monaco files
 * should be retrieved from.
 *
 * @author David Festal
 */
export class Cdn {

    static readonly defaultTheiaCdnPrefix = 'https://cdn.jsdelivr.net/gh/davidfestal/che-theia-cdn@latest/che-theia-editor/';
    static readonly defaultMonacoCdnPrefix = 'https://cdn.jsdelivr.net/npm/';
    static argBuilder = (theYargs: any) => {
        return theYargs.option('theia', {
            describe: 'Base URL of the CDN that will host Theia files',
            requiresArg: true,
            type: 'string',
            default: Cdn.defaultTheiaCdnPrefix,
            defaultDescription: Cdn.defaultTheiaCdnPrefix
        }).option('monaco', {
            describe: 'Base URL of the CDN that will host Monaco Editor files',
            requiresArg: true,
            type: 'string',
            default: Cdn.defaultMonacoCdnPrefix,
            defaultDescription: Cdn.defaultMonacoCdnPrefix
        });
    }

    constructor(readonly assemblyFolder: string, readonly theiaCDN: string, readonly monacoCDN: string) {
    }

    public async create(): Promise<void> {
        await fs.writeFile(path.join(this.assemblyFolder, 'cdn.json'), JSON.stringify({
            theia: this.theiaCDN,
            monaco: this.monacoCDN
        }));
    }
}
