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
import * as fs from 'fs';

import { Command } from '../../src/command';
import { Yarn } from '../../src/yarn';

jest.mock('../../src/command');

describe('Test yarn dependencies', () => {
    let yarn: Yarn;

    beforeEach(() => {
        yarn = new Yarn('/tmp', '/tmp', [], []);
    });

    test('invalid output', async () => {
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, 'error');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        try {
            await yarn.getDependencies('foo');
        } catch (e) {
            expect(e.toString()).toMatch(/Not able to find a dependency tree.*$/);
        }
    });

    test('invalid config output', async () => {
        const output = fs.readFileSync(__dirname + '/json-list-prod-no-dep.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, 'error');
        try {
            await yarn.getDependencies('foo');
        } catch (e) {
            expect(e.toString()).toMatch(/Not able to get yarn configuration when executing yarn config current.*$/);
        }
    });

    test('module not fond', async () => {
        const output = fs.readFileSync(__dirname + '/json-list-prod-no-dep.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        try {
            await yarn.getDependencies('');
        } catch (e) {
            expect(e.toString()).toMatch(/The initial module  was not found in dependencies.*$/);
        }
    });

    test('one dependency', async () => {
        const output = fs.readFileSync(__dirname + '/json-list-prod-one-dep.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        const dependencyList = await yarn.getDependencies('lodash');
        expect(dependencyList).toEqual(['/tmp/node_modules/depd']);
    });

    test('one dependency duplicated', async () => {
        const output = fs.readFileSync(__dirname + '/json-list-prod-one-dep-duplicate.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        const dependencyList = await yarn.getDependencies('lodash');
        expect(dependencyList).toEqual(['/tmp/node_modules/depd']);
    });

    test('dependencies with excluding not matching', async () => {
        const customYarn = new Yarn('/tmp', '/tmp', [], ['not-a-dependency']);
        const output = fs.readFileSync(__dirname + '/json-list-prod-webpack.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        const dependencyList = await customYarn.getDependencies('webpack');
        expect(dependencyList.length).toEqual(309);
    });

    test('one dependency with forbidden not matching', async () => {
        const customYarn = new Yarn('/tmp', '/tmp', ['not-a-dependency'], []);
        const output = fs.readFileSync(__dirname + '/json-list-prod-excluded.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        const dependencyList = await customYarn.getDependencies('react');
        expect(dependencyList).toEqual(['/tmp/node_modules/loose-envify', '/tmp/node_modules/js-tokens']);
    });

    test('one dependency with excluded', async () => {
        const customYarn = new Yarn('/tmp', '/tmp', [], ['js-tokens']);
        const output = fs.readFileSync(__dirname + '/json-list-prod-excluded.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        const dependencyList = await customYarn.getDependencies('react');
        expect(dependencyList).toEqual(['/tmp/node_modules/loose-envify']);
    });

    test('one dependency with forbidden matching', async () => {
        const customYarn = new Yarn('/tmp', '/tmp', ['js-tokens'], []);
        const output = fs.readFileSync(__dirname + '/json-list-prod-excluded.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        try {
            await customYarn.getDependencies('react');
        } catch (e) {
            expect(e.toString()).toMatch(
                /Forbidden dependencies js-tokens has been found as dependencies of loose-envifyCurrent dependencies: js-tokens, excluded list: js-tokens.*$/
            );
        }
    });

    test('one dependency with custom node_modules folder', async () => {
        const output = fs.readFileSync(__dirname + '/json-list-prod-one-dep.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);

        const configOutput = fs.readFileSync(__dirname + '/json-config-modules-folder.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, configOutput);

        const dependencyList = await yarn.getDependencies('lodash');
        expect(dependencyList).toEqual(['/node_modules/depd']);
    });

    test('one dependency with children', async () => {
        const output = fs.readFileSync(__dirname + '/json-list-prod-one-dep-children.stdout');
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_DEPENDENCIES, output);
        (Command as any).__setExecCommandOutput(Yarn.YARN_GET_CONFIG, '{"type":"log","data":"{}"}');
        const dependencyList = await yarn.getDependencies('http-errors');
        expect(dependencyList.length).toBe(4);
    });
});
