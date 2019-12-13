/*********************************************************************
* Copyright (c) 2019 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import { BuiltinExtensions } from '../../src/builtin-extensions';
import { Command } from '../../src/command';

jest.mock('../../src/command');

describe('Test Builtin Extensions', () => {

    let rootFolderTmp: string;
    let pluginsFolderTmp: string;

    beforeEach(async () => {
        rootFolderTmp = tmp.dirSync({ mode: 0o750, prefix: 'tmpInit', postfix: '' }).name;
        pluginsFolderTmp = path.resolve(rootFolderTmp, 'plugins');
    });

    afterEach(() => {
        fs.removeSync(rootFolderTmp);
    });

    test('test download extensions', async () => {
        (Command as any).__setExecCommandOutput(new RegExp('wget .*'), '...');
        const expected = fs.readFileSync('tests/builtin-extensions/builtin-extensions')
            .toString()
            .split('\n')
            .filter(value => !!value);

        const builtinExtensions = new BuiltinExtensions(pluginsFolderTmp);
        expect(await builtinExtensions.download()).toEqual(expected);
    });

});
