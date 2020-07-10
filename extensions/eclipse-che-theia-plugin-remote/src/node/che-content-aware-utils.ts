/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as theia from '@theia/plugin';
import { URI } from 'vscode-uri';

export function overrideUri(uri: { path: string, scheme: string, with: (change: { scheme?: string }) => URI | theia.Uri }): URI {
    const cheProjectsRoot = process.env.CHE_PROJECTS_ROOT;
    const machineName = process.env.CHE_MACHINE_NAME;
    if (uri.scheme === 'file' && machineName && cheProjectsRoot && !uri.path.startsWith(cheProjectsRoot)) {
        return uri.with({ scheme: `file-sidecar-${machineName}` });
    } else {
        return uri.with({ scheme: uri.scheme });
    }
}
