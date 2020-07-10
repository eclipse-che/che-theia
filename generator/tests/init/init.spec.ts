/*
 * Copyright (c) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import * as path from 'path';
import * as tmp from "tmp";
import * as fs from 'fs-extra';
import { Init } from "../../src/init";
import { Command } from "../../src/command";

jest.setTimeout(10000);
jest.mock("../../src/command");

describe("Test Init", () => {

    const rootFolder = process.cwd();
    const rootFolderTheia = path.resolve(rootFolder, "tests/init/root-folder");
    let rootFolderTmp: string;
    let examplesAssemblyFolderTmp: string;
    let cdnFolderTmp: string;
    let checkoutFolderTmp: string;
    let pluginsFolderTmp: string;


    beforeEach(async () => {
        rootFolderTmp = tmp.dirSync({ mode: 0o750, prefix: "tmpInit", postfix: "" }).name;
        examplesAssemblyFolderTmp = path.resolve(rootFolderTmp, 'examples/assembly');
        checkoutFolderTmp = path.resolve(rootFolderTmp, 'checkout-folder');
        cdnFolderTmp = path.resolve(examplesAssemblyFolderTmp, 'cdn');
        pluginsFolderTmp = path.resolve(rootFolderTmp, 'plugins');
    });

    afterEach(() => {
        // remove tmp directory
        fs.removeSync(rootFolderTmp);
    });


    test("test getTheia version", async () => {
        const init = new Init(rootFolderTheia, '', '', '');
        expect(await init.getCurrentVersion()).toBe('0.0.123');
    });

    test("test getPackageWithVersion when no version is available", async () => {
        (Command as any).__setExecCommandOutput(
                Init.GET_PACKAGE_WITH_VERSION_CMD + Init.MONACO_CORE_PKG,
                '{"type":"tree","data":{"type":"list","trees":[]}}');
        const init = new Init(rootFolderTheia, '', '', '');
        expect(await init.getPackageWithVersion(Init.MONACO_CORE_PKG)).toBe('');
    });

    test("test generate", async () => {
        const coreVersion = 'coreVersion';
        [[Init.MONACO_CORE_PKG, coreVersion]]
        .forEach(([pkg, version]) => {
            (Command as any).__setExecCommandOutput(
                Init.GET_PACKAGE_WITH_VERSION_CMD + pkg,
                '{"type":"tree","data":{"type":"list","trees":[{"name": "' + pkg + '@' + version + '"}]}}');
        });

        const init = new Init(rootFolderTheia, examplesAssemblyFolderTmp, checkoutFolderTmp, pluginsFolderTmp);
        await init.generate();
        // check file has been generated and contains correct version
        const contentPackageJson = await fs.readFile(path.join(examplesAssemblyFolderTmp, 'package.json'));
        const packageJson = JSON.parse(contentPackageJson.toString());
        expect(packageJson.name).toBe('@eclipse-che/theia-assembly');
        expect(packageJson['dependencies']['@theia/core']).toBe('^' + await init.getCurrentVersion());
        expect(packageJson['scripts']['build']).toBe('theia build --mode production --config cdn/webpack.config.js --env.cdn=./cdn.json'
            + ' --env.monacopkg=' + Init.MONACO_CORE_PKG + '@' + coreVersion
            + ' && yarn run override-vs-loader');
        // check folders have been created
        expect(fs.existsSync(examplesAssemblyFolderTmp)).toBeTruthy();
        expect(fs.existsSync(checkoutFolderTmp)).toBeTruthy();

        // check folders have been created
        expect(fs.existsSync(cdnFolderTmp)).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'custom-html.html'))).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'vs-loader.js'))).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'base.js'))).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'bootstrap.js'))).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'html-template.js'))).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'webpack-loader.js'))).toBeTruthy();
        expect(fs.existsSync(path.resolve(cdnFolderTmp, 'webpack.config.js'))).toBeTruthy();

        // check that build plugins script has been copied
        expect(fs.existsSync(path.resolve(pluginsFolderTmp, 'foreach_yarn'))).toBeTruthy();
    });

});
