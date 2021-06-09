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

import { handleCommand } from '../src/link';

jest.setTimeout(30000);

describe('Test link command', () => {
    let rootFolderTmp: string;
    let srcFolder: string;
    let theiaFolder: string;

    beforeEach(async () => {
        rootFolderTmp = tmp.dirSync({ mode: 0o750, prefix: 'tmpLink', postfix: '' }).name;
        srcFolder = path.resolve(rootFolderTmp, 'src');
        fs.ensureDirSync(srcFolder);
        const theiaSource = path.resolve(__dirname, 'link');
        theiaFolder = path.resolve(rootFolderTmp, 'link');
        const linkFolder = path.resolve(rootFolderTmp, 'links');
        fs.writeFileSync(path.resolve(rootFolderTmp, '.yarnrc'), `--link-folder ${linkFolder}`);
        fs.copySync(theiaSource, theiaFolder);
        if (!fs.existsSync(theiaFolder)) {
            throw new Error('no copy');
        }
        await fs.ensureDir(rootFolderTmp);
    });

    test('test link', async () => {
        await handleCommand({
            theia: theiaFolder,
            'che-theia': srcFolder,
        });

        const fooPackage = path.resolve(srcFolder, 'node_modules/@theia/foo/package.json');
        const barPackage = path.resolve(srcFolder, 'node_modules/@theia/bar/package.json');
        const zozPackage = path.resolve(srcFolder, 'node_modules/@theia/zoz/package.json');

        expect(fs.existsSync(fooPackage)).toBeTruthy();
        expect(fs.existsSync(barPackage)).toBeTruthy();
        expect(fs.existsSync(zozPackage)).toBeTruthy();
    });
});
