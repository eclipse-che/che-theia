/**********************************************************************
 * Copyright (c) 2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as fs from 'fs-extra';
import * as path from 'path';

export interface YarnWorkspace {
    name: string;
    location: string;
    workspaceDependencies: string[];
    mismatchedWorkspaceDependencies: string[];
}

const EXCLUDED_REFERENCES = ['examples/api-samples', 'examples/browser', 'examples/electron', 'packages/git'];

/**
 * Update root tsconfig.json file
 */
export async function updateRootTsConfigFile(rootFolder: string): Promise<void> {
    const excludedReferences = EXCLUDED_REFERENCES.map(excluded => path.resolve(rootFolder, excluded));
    return updateTsConfigFile(rootFolder, ['examples/assembly'], excludedReferences);
}

/**
 * Update /theia/examples/assembly tsconfig.json file
 */
export async function updateAssemblyTsConfigFile(rootFolder: string, assemblyFolder: string): Promise<void> {
    // get theia references
    const theiaReferencesFilePath = path.join(__dirname, '../src', 'templates', 'theia-references.json');
    const theiaReferencesRawData = await fs.readFile(theiaReferencesFilePath);
    const theiaReferencesParsedData = JSON.parse(theiaReferencesRawData.toString());
    const theiaReferences = theiaReferencesParsedData['references'] as Array<{ path: string }>;

    // filter references
    const excludedReferences = EXCLUDED_REFERENCES.map(excluded => path.resolve(rootFolder, excluded));
    const verifiedTheiaReferences = await verifyReferencies(rootFolder, theiaReferences, excludedReferences);

    // get theia references as relative
    const preparedTheiaReferences = verifiedTheiaReferences.map(reference => {
        const absolutePath = path.resolve(rootFolder, reference.path);
        const relativePath = path.posix.relative(assemblyFolder, absolutePath);
        return { path: relativePath };
    });

    // get assembly references
    const assemblyTsConfigPath = path.join(assemblyFolder, 'tsconfig.json');
    const assemblyTsConfigRawData = await fs.readFile(assemblyTsConfigPath);
    const assemblyTsConfigParsedData = JSON.parse(assemblyTsConfigRawData.toString());
    const assemblyReferences = assemblyTsConfigParsedData['references'] as Array<{ path: string }>;

    // get assembly references as relative
    const preparedAssemblyReferences = assemblyReferences.map(reference => {
        const absolutePath = path.resolve(assemblyFolder, reference.path);
        const relativePath = path.posix.relative(assemblyFolder, fs.realpathSync(absolutePath));
        return { path: relativePath };
    });

    // concat references
    const newData = preparedTheiaReferences.concat(preparedAssemblyReferences);
    assemblyTsConfigParsedData['references'] = newData;

    // write the result back to config file
    const newContent = JSON.stringify(assemblyTsConfigParsedData, undefined, 2);
    await fs.writeFile(assemblyTsConfigPath, newContent);
}

export async function updateTypescriptReferencesFor(
    packagePath: string,
    dependencies: string[],
    yarnWorkspaces: Map<string, YarnWorkspace>
): Promise<void> {
    const tsReferencies = await getTypescriptReferences(packagePath, dependencies, yarnWorkspaces);
    await updateTsConfigFile(packagePath, tsReferencies, []);
}

async function getTypescriptReferences(
    packagePath: string,
    dependencies: string[],
    yarnWorkspaces: Map<string, YarnWorkspace>
): Promise<string[]> {
    const references = await Promise.all(
        dependencies.map(async dependencyName => {
            const dependency = yarnWorkspaces.get(dependencyName);
            if (!dependency) {
                return undefined;
            }
            const dependencyTsConfigPath = path.join(fs.realpathSync(dependency.location), 'tsconfig.json');
            // we consider only dependencies with tsconfig to apply incremental build
            if (!(await fs.pathExists(dependencyTsConfigPath))) {
                return undefined;
            }
            return path.posix.relative(fs.realpathSync(packagePath), fs.realpathSync(dependency.location));
        })
    );
    return references.filter(reference => reference !== undefined) as string[];
}

async function updateTsConfigFile(
    packagePath: string,
    expectedReferences: string[],
    excludedReferences: string[]
): Promise<void> {
    const tsConfigPath = path.join(packagePath, 'tsconfig.json');
    if (!(await fs.pathExists(tsConfigPath))) {
        return;
    }

    const tsConfigRawData = await fs.readFile(tsConfigPath);
    const tsConfigParsedData = JSON.parse(tsConfigRawData.toString());

    const compilerOptions = tsConfigParsedData.compilerOptions;
    if (!compilerOptions.composite) {
        tsConfigParsedData.compilerOptions = {
            composite: true,
            ...compilerOptions,
        };
    }

    const tsConfigReferences = tsConfigParsedData.references || [];
    const references = tsConfigReferences.concat(
        expectedReferences.map(reference => ({
            path: reference,
        }))
    );

    tsConfigParsedData.references =
        excludedReferences.length > 0
            ? await verifyReferencies(packagePath, references, excludedReferences)
            : references;

    const newContent = JSON.stringify(tsConfigParsedData, undefined, 2);
    await fs.writeFile(tsConfigPath, newContent);
}

async function verifyReferencies(
    tsConfigFolder: string,
    referencies: { path: string }[],
    excludedReferences: string[]
): Promise<{ path: string }[]> {
    const result = await Promise.all(
        referencies.map(async reference => {
            const tsConfigPath = path.resolve(tsConfigFolder, reference.path);
            if (excludedReferences.includes(tsConfigPath) || !(await fs.pathExists(tsConfigPath))) {
                return undefined;
            }
            return reference;
        })
    );
    return result.filter(reference => reference !== undefined) as { path: string }[];
}
