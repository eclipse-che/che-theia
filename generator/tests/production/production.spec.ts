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

import { Production } from '../../src/production';
import { Yarn } from '../../src/yarn';

jest.setTimeout(10000);
jest.mock('../../src/yarn');

describe('Test production', () => {
    let production: Production;

    let rootFolderTmp: string;
    let examplesAssemblyFolderTmp: string;
    let productionFolderTmp: string;
    const rootFolder = process.cwd();
    const assemblyExamplePath = path.resolve(rootFolder, 'tests/production/assembly');

    beforeEach(async () => {
        rootFolderTmp = tmp.dirSync({ mode: 0o750, prefix: 'tmpProduction', postfix: '' }).name;
        examplesAssemblyFolderTmp = path.resolve(rootFolderTmp, 'examples/assembly');
        productionFolderTmp = path.resolve(rootFolderTmp, 'prod');

        await fs.ensureDir(examplesAssemblyFolderTmp);
    });

    afterEach(() => {
        // remove tmp directory
        fs.removeSync(rootFolderTmp);
    });

    test('Test create', async () => {
        const dependency1Name = 'node_modules/dependency-1';
        const dependencyDir1 = path.resolve(rootFolderTmp, dependency1Name);
        const dependencies: string[] = [dependencyDir1];
        (Yarn as any).__setDependencies('@eclipse-che/theia-assembly', dependencies);

        await fs.ensureDir(dependencyDir1);
        await fs.writeFile(path.join(dependencyDir1, 'lib1.js'), '');
        await fs.writeFile(path.join(dependencyDir1, 'test.js'), '');

        const srcGenDir1 = path.join(examplesAssemblyFolderTmp, 'src-gen/foo');
        await fs.ensureDir(srcGenDir1);
        await fs.writeFile(path.join(srcGenDir1, 'index.js'), '');
        const srcGenDir2 = path.join(examplesAssemblyFolderTmp, 'src-gen/bar');
        await fs.ensureDir(srcGenDir2);
        await fs.writeFile(path.join(srcGenDir2, 'index.js'), '');

        const libDir1 = path.join(examplesAssemblyFolderTmp, 'lib/dummy');
        await fs.ensureDir(libDir1);
        await fs.writeFile(path.join(libDir1, 'mylib'), '');

        // write a package.json file
        await fs.copy(
            path.join(assemblyExamplePath, 'package.json'),
            path.join(examplesAssemblyFolderTmp, 'package.json')
        );
        // write lock file
        await fs.copy(path.join(assemblyExamplePath, 'yarn.lock'), path.join(rootFolderTmp, 'yarn.lock'));

        production = new Production(rootFolderTmp, examplesAssemblyFolderTmp, productionFolderTmp);
        const productionReady = await production.create();

        // check if src-gen files are there
        expect(fs.existsSync(path.join(productionReady, 'src-gen/foo/index.js'))).toBeTruthy();
        expect(fs.existsSync(path.join(productionReady, 'src-gen/bar/index.js'))).toBeTruthy();

        // check if lib files are there
        expect(fs.existsSync(path.join(productionReady, 'lib/dummy/mylib'))).toBeTruthy();

        // check dependencies are there
        expect(fs.existsSync(path.join(productionReady, dependency1Name, 'lib1.js'))).toBeTruthy();
        expect(fs.existsSync(path.join(productionReady, dependency1Name, 'test.js'))).toBeTruthy();
    });

    test('Test invalid dependency', async () => {
        const dependencies: string[] = ['invalid'];
        (Yarn as any).__setDependencies('@eclipse-che/theia-assembly', dependencies);

        // write a package.json file
        // await fs.copy(path.join(assemblyExamplePath, 'package.json'), path.join(examplesAssemblyFolderTmp, 'package.json'));
        // write lock file
        // await fs.copy(path.join(assemblyExamplePath, 'yarn.lock'), path.join(rootFolderTmp, 'yarn.lock'));

        production = new Production(rootFolderTmp, examplesAssemblyFolderTmp, productionFolderTmp);
        try {
            await production.create();
        } catch (e) {
            expect(e.toString()).toMatch(
                /The dependency invalid is referenced but is not available on the filesystem.*$/
            );
        }
    });
});
