/*********************************************************************
* Copyright (c) 2018 Red Hat, Inc.
*
* This program and the accompanying materials are made
* available under the terms of the Eclipse Public License 2.0
* which is available at https://www.eclipse.org/legal/epl-2.0/
*
* SPDX-License-Identifier: EPL-2.0
**********************************************************************/

import * as path from 'path';
import { Command } from './command';
import { Logger } from './logger';
import { CliError } from './cli-error';

/**
 * Handle the parsing of node packages with Yarn.
 * It allows to grab direct/production dependencies (not the dev dependencies)
 * @author Florent Benoit
 */
export class Yarn {

    /**
     * Command to grab dependencies
     */
    public static readonly YARN_GET_DEPENDENCIES = 'yarn list --json --prod';

    /**
     * Command to grab yarn configuration.
     */
    public static readonly YARN_GET_CONFIG = 'yarn config current --json';

    constructor(readonly rootFolder: string,
        private readonly dependenciesDirectory: string,
        private readonly forbiddenPackages: string[],
        private readonly excludedPackages: string[],
    ) { }

    /**
     * Get package.json dependency paths (not including dev dependencies)
     */
    public async getDependencies(rootModule: string): Promise<string[]> {

        // grab output of the command
        const command = new Command(this.dependenciesDirectory);
        const stdout = await command.exec(Yarn.YARN_GET_DEPENDENCIES);

        // Check that we've tree array
        const match = /^{"type":"tree","data":{"type":"list","trees":(.*)}}$/gm.exec(stdout);
        if (!match || match.length !== 2) {
            throw new CliError('Not able to find a dependency tree when executing '
                + Yarn.YARN_GET_DEPENDENCIES + '. Found ' + stdout);
        }

        // parse array into JSON
        const inputTrees: IYarnNode[] = JSON.parse(match[1]);

        // Get node_modules folder
        const configStdout = await command.exec(Yarn.YARN_GET_CONFIG);

        const matchConfig = /^{"type":"log","data":"(.*)"}$/gm.exec(configStdout);
        if (!matchConfig || matchConfig.length !== 2) {
            throw new CliError('Not able to get yarn configuration when executing '
                + Yarn.YARN_GET_CONFIG + '. Found ' + configStdout);
        }

        // parse array into JSON
        const unescaped = matchConfig[1].replace(/\\n/g, '').replace(/\\"/g, '"');
        const jsonConfig = JSON.parse(unescaped);
        let nodeModulesFolder = jsonConfig.modulesFolder;
        if (!nodeModulesFolder) {
            nodeModulesFolder = path.resolve(this.rootFolder, 'node_modules');
        }

        // First, populate in a tree all the dependencies found by yarn
        const nodeTreeDependencies = new Map<string, string[]>();
        inputTrees.map(yarnNode => this.insertNode(yarnNode, nodeTreeDependencies));

        // now, capture only expected dependencies for the given root module (so we drop some other dependencies that may be in yarn.lock file)
        const subsetDependencies: string[] = [];
        const initNode = nodeTreeDependencies.get(rootModule);
        if (!initNode) {
            throw new CliError(`The initial module ${rootModule} was not found in dependencies`);
        }

        this.findDependencies(initNode, nodeTreeDependencies, subsetDependencies);

        // OK, now grab folders for each of these dependencies
        const nodePackages: INodePackage[] = [];
        subsetDependencies.forEach(moduleName => this.addNodePackage(nodeModulesFolder, moduleName, nodePackages));

        // return unique entries
        return Promise.resolve(nodePackages.map((e) => e.path).filter((value, index, array) => {
            return index === array.indexOf(value);
        }));
    }

    /**
     * Find from children all the direct dependencies. Also exclude some dependencies by not analyzing them.
     * Allow as well to report error in case of a forbidden dependency found
     * @param children the list of dependencies to analyze
     * @param nodeTreeDependencies the object containing the tree of dependencies
     * @param subsetDependencies  the
     */
    protected findDependencies(children: string[], nodeTreeDependencies: Map<string, string[]>, subsetDependencies: string[]): void {
        children.map(child => {
            // only loop on exist
            if (subsetDependencies.indexOf(child) >= 0) {
                return;
            }
            subsetDependencies.push(child);

            // loop on children in any
            let depChildren = nodeTreeDependencies.get(child);
            if (depChildren) {
                depChildren = depChildren.filter(depChild => {
                    const res = this.excludedPackages.indexOf(depChild) < 0;
                    if (!res) {
                        Logger.debug(` --> Excluding the dependency ${depChild}`);
                    }
                    return res;
                });

                const matching: string[] = [];
                const foundForbiddenPackage = depChildren.some(r => {
                    const res = this.forbiddenPackages.indexOf(r) >= 0;
                    if (res) {
                        matching.push(r);
                    }
                    return res;
                });
                if (foundForbiddenPackage) {
                    throw new CliError(`Forbidden dependencies ${matching} has been found as dependencies of ${child}` +
                        `Current dependencies: ${depChildren}, excluded list: ${this.forbiddenPackages}`);
                }
                this.findDependencies(depChildren, nodeTreeDependencies, subsetDependencies);
            }
        }
        );
    }

    /**
     * Insert the given node into the Map/tree of dependencies
     * @param yarnNode the node to insert
     * @param nodeTreeDependencies the tree to update
     */
    protected insertNode(yarnNode: IYarnNode, nodeTreeDependencies: Map<string, string[]>): void {
        const npmModuleName = yarnNode.name.substring(0, yarnNode.name.lastIndexOf('@'));

        // init dependencies object if not existing
        let dependencies = nodeTreeDependencies.get(npmModuleName);
        if (!dependencies) {
            dependencies = [];
            nodeTreeDependencies.set(npmModuleName, dependencies);
        }

        // insert all children as well
        if (yarnNode.children) {
            yarnNode.children.map(child => {
                const childName = child.name.substring(0, child.name.lastIndexOf('@'));
                dependencies!.push(childName);
                this.insertNode(child, nodeTreeDependencies);
            });
        }
    }

    /**
     * Add a node package (entry of yarn list) to the given array.
     * Also loop on all children and call ourself back
     * @param nodeModulesFolder the node_modules location
     * @param yarnNode the node entry to add
     * @param packages the array representing all node dependencies
     */
    protected async addNodePackage(nodeModulesFolder: string, moduleName: string, packages: INodePackage[]): Promise<void> {

        // build package
        const nodePackage = { name: moduleName, path: path.resolve(nodeModulesFolder, moduleName) };

        // add to the array
        packages.push(nodePackage);
    }

}

/**
 * Describes a node package entry (a name and a path)
 */
export interface INodePackage {
    name: string;
    path: string;
}

/**
 * Describes parsed result of yarn/json output
 */
export interface IYarnNode {
    name: string;
    children: IYarnNode[];
}
