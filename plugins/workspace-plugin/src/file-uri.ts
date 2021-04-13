/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as path from 'path';

/**
 * Returns path of the given project according projects directory.
 * Given project should be in subtree of root projects directory.
 *
 * @param fileURI root folder of the project
 * @param rootFolder root folder for all projects in workspace
 */
export function convertToCheProjectPath(fileURI: string, rootFolder: string): string {
  return path.relative(rootFolder, fileURI);
}
