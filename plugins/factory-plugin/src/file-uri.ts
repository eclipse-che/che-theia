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

export function convertToFileURI(file: string, rootFolder?: string): string {
    if (file.startsWith('file://')) {
        return file;
    }
    if (!rootFolder) {
        rootFolder = '/projects';
    }
    if (rootFolder.endsWith('/')) {
        rootFolder = rootFolder.substring(0, rootFolder.length - 1);
    }
    if (!file.startsWith('/')) {
        file = `/${file}`;
    }
    if (rootFolder.startsWith('file://')) {
        return rootFolder + file;
    }
    if (!rootFolder.startsWith('/')) {
        rootFolder = `/${rootFolder}`;
    }
    return `file://${rootFolder}${file}`;

}

/**
 * Returns path of the given project according projects directory.
 * Given project should be in subtree of root projects directory.
 *
 * @param fileURI root folder of the project
 * @param rootFolder root folder for all projects in workspace
 */
export function convertToCheProjectPath(fileURI: string, rootFolder: string): string {
    if (!rootFolder) {
        // default value
        rootFolder = '/projects';
    }
    return path.relative(rootFolder, fileURI);
}
