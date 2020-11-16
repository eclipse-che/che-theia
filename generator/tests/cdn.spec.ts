/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';

import { Cdn } from '../src/cdn';

export class YargsMockup {
    options: any = {};
    option(name: string, opt: any) {
        this.options[name] = opt;
        return this;
    }
}

describe('Test Cdn command', () => {
    let rootFolderTmp: string;
    let examplesAssemblyFolderTmp: string;

    beforeEach(async () => {
        rootFolderTmp = tmp.dirSync({ mode: 0o750, prefix: 'tmpInit', postfix: '' }).name;
        examplesAssemblyFolderTmp = path.resolve(rootFolderTmp, 'examples/assembly');
        await fs.ensureDir(examplesAssemblyFolderTmp);
    });

    test('test command options', async () => {
        const yargs = new YargsMockup();
        Cdn.argBuilder(yargs);
        expect(yargs.options['theia']).toEqual({
            describe: 'Base URL of the CDN that will host Theia files',
            requiresArg: true,
            type: 'string',
            default: Cdn.defaultTheiaCdnPrefix,
            defaultDescription: Cdn.defaultTheiaCdnPrefix,
        });
        expect(yargs.options['monaco']).toEqual({
            describe: 'Base URL of the CDN that will host Monaco Editor files',
            requiresArg: true,
            type: 'string',
            default: Cdn.defaultMonacoCdnPrefix,
            defaultDescription: Cdn.defaultMonacoCdnPrefix,
        });
    });

    test('test create', async () => {
        const theiaCDN = 'theiaCDN';
        const monacoCDN = 'monacoCDN';

        const cdn = new Cdn(examplesAssemblyFolderTmp, theiaCDN, monacoCDN);
        await cdn.create();

        const cdnFile = path.join(examplesAssemblyFolderTmp, 'cdn.json');
        expect(fs.existsSync(cdnFile)).toBeTruthy();

        const contentCdnJson = await fs.readFile(cdnFile);
        const cdnJson = JSON.parse(contentCdnJson.toString());
        expect(cdnJson.theia).toBe(theiaCDN);
        expect(cdnJson.monaco).toBe(monacoCDN);
    });
});
