/**********************************************************************
 * Copyright (c) 2018-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

/**
 * Simple code to rewrite parts of JSON files
 * @author Thomas Mäder
 */

import * as fs from 'fs-extra';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rewriteJson(packageJSONPath: string, rewriteFunction: (json: any) => void) {
    const json = await fs.readJSON(packageJSONPath);
    rewriteFunction(json);

    await fs.writeJson(packageJSONPath, json, { encoding: 'utf-8', spaces: 2 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function replaceInSection(section: any, replaceVersion: (key: string) => string | undefined) {
    if (section) {
        for (const dep in section) {
            if (section.hasOwnProperty(dep)) {
                const replacement = replaceVersion(dep);
                if (replacement) {
                    section[dep] = replacement;
                }
            }
        }
    }
}
