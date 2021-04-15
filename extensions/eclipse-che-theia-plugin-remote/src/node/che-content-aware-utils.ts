/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

import { URI } from 'vscode-uri';

export function overrideUri(uri: {
  path: string;
  scheme: string;
  with: (change: { scheme?: string }) => URI | theia.Uri;
}): URI {
  // If PROJECTS_ROOT is defined use it else switch to old CHE_PROJECTS_ROOT env name or use default
  const projectsRoot = process.env.PROJECTS_ROOT || process.env.CHE_PROJECTS_ROOT || '/projects';
  // If DEVWORKSPACE_COMPONENT_NAME is defined use it else switch to old CHE_MACHINE_NAME env name
  const componentName = process.env.DEVWORKSPACE_COMPONENT_NAME || process.env.CHE_MACHINE_NAME;
  if (uri.scheme === 'file' && componentName && projectsRoot && !uri.path.startsWith(projectsRoot)) {
    return uri.with({ scheme: `file-sidecar-${componentName}` });
  } else {
    return uri.with({ scheme: uri.scheme });
  }
}
