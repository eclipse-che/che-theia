/**********************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as theia from '@theia/plugin';

let out: theia.OutputChannel | undefined;

export function output(): theia.OutputChannel {
  if (!out) {
    out = theia.window.createOutputChannel('workspace-plugin');
  }

  return out;
}
