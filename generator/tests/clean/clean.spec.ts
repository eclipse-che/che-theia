/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { Clean } from '../../src/clean';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Test clean command', () => {

    beforeAll(() => {

    });

    test('Test clean', () => {
        const chePath = path.resolve(__dirname, 'che');
        fs.ensureDirSync(chePath);

        const assemblyPath = path.resolve(__dirname, 'assembly');
        fs.ensureDirSync(assemblyPath);

        const packagesFolder = path.resolve(__dirname, 'packages');
        fs.ensureDirSync(packagesFolder);
        fs.ensureSymlinkSync(path.resolve(__dirname), path.resolve(packagesFolder, '@ext-symlink'));
        fs.ensureDirSync(path.resolve(packagesFolder, 'default-ext'));

        const pluginsFolder = path.resolve(__dirname, 'plugins');
        fs.ensureDirSync(pluginsFolder);
        fs.ensureSymlinkSync(path.resolve(__dirname), path.resolve(pluginsFolder, 'plugin-symlink'));

        const nodeModules = path.resolve(__dirname, 'NodeModules');
        fs.ensureDirSync(nodeModules);

        const c = new Clean(assemblyPath, chePath, packagesFolder, pluginsFolder, nodeModules);

        c.cleanCheTheia();

        expect(fs.existsSync(chePath)).toBe(false);
        expect(fs.existsSync(assemblyPath)).toBe(false);
        expect(fs.existsSync(nodeModules)).toBe(false);
        expect(fs.existsSync(path.resolve(packagesFolder, '@ext-symlink'))).toBe(false);
        expect(fs.readdirSync(packagesFolder)).toEqual(['default-ext']);
        expect(fs.existsSync(path.resolve(pluginsFolder, 'plugin-symlink'))).toBe(false);

        fs.removeSync(path.resolve(packagesFolder, 'default-ext'));
    });

});
