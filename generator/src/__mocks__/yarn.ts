/**********************************************************************
 * Copyright (c) 2018-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

'use strict';

/**
 * Mock of the Yarn class.
 */
export class Yarn {
    /**
     * Map between the name of the root Moduleand the output.
     */
    private static readonly dependenciesMap: Map<string, string[]> = new Map();

    // mock any exec command by providing the output
    public static __setDependencies(rootModule: string, dependencies: string[]): void {
        Yarn.dependenciesMap.set(rootModule, dependencies);
    }

    constructor() {}

    public async getDependencies(rootModule: string): Promise<string[]> {
        const result = Yarn.dependenciesMap.get(rootModule);
        if (result) {
            return Promise.resolve(result);
        } else {
            return Promise.resolve([]);
        }
    }
}
